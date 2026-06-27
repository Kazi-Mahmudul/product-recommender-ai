#!/usr/bin/env python3
"""
Manual end-to-end pipeline runner.

Runs:
1) Extraction (mobile + optional processor rankings)
2) Processing and direct database loading
3) Loading/consistency validation
4) Top searched update (optional)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from pipeline.github_actions.extract_data import scrape_mobile_data, scrape_processor_rankings
from pipeline.github_actions.load_data import validate_database_consistency, validate_processing_results
from pipeline.github_actions.process_data import (
    get_scraped_data_from_database,
    load_processor_rankings,
    process_data_with_pipeline,
)
from pipeline.github_actions.update_top_searched import run_top_searched_pipeline


logger = logging.getLogger("pipeline_e2e_runner")


def setup_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def as_bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def json_safe(obj: Any) -> Any:
    if hasattr(obj, "item"):
        return obj.item()
    if isinstance(obj, dict):
        return {k: json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [json_safe(v) for v in obj]
    return obj


def ensure_required_env() -> None:
    if not os.getenv("DATABASE_URL"):
        raise RuntimeError("DATABASE_URL is required to run this pipeline.")


def run_pipeline(args: argparse.Namespace) -> Dict[str, Any]:
    start_time = time.time()
    pipeline_run_id = args.pipeline_run_id or f"manual_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    results: Dict[str, Any] = {
        "pipeline_run_id": pipeline_run_id,
        "started_at": datetime.now().isoformat(),
        "max_pages": args.max_pages,
        "test_mode": args.test_mode,
    }

    logger.info("Starting manual pipeline run")
    logger.info("   Run ID: %s", pipeline_run_id)
    logger.info("   Max pages: %s", args.max_pages)
    logger.info("   Test mode: %s", args.test_mode)

    # Step 1: Extraction
    mobile_result = scrape_mobile_data(
        pipeline_run_id=pipeline_run_id,
        max_pages=args.max_pages,
        test_mode=args.test_mode,
    )
    results["mobile_scraping"] = mobile_result

    if mobile_result.get("status") != "success":
        raise RuntimeError(f"Mobile scraping failed: {mobile_result.get('error', 'Unknown error')}")

    if args.skip_processor_rankings:
        processor_result = {
            "status": "skipped",
            "pipeline_run_id": pipeline_run_id,
            "timestamp": datetime.now().isoformat(),
        }
    else:
        processor_result = scrape_processor_rankings(
            pipeline_run_id=pipeline_run_id,
            force_update=args.force_processor_refresh,
            test_mode=args.test_mode,
        )
    results["processor_scraping"] = processor_result

    # Step 2: Processing + direct DB loading
    processor_df = None
    if processor_result.get("status") == "success":
        processor_df = load_processor_rankings()

    df = get_scraped_data_from_database(pipeline_run_id)
    if df is None or len(df) == 0:
        processing_result = {
            "status": "success",
            "processing_method": "no_data",
            "records_processed": 0,
            "records_rejected": 0,
            "quality_score": 100.0,
            "quality_passed": True,
            "features_generated": 0,
            "message": "No data found for this run to process",
            "pipeline_run_id": pipeline_run_id,
            "timestamp": datetime.now().isoformat(),
        }
    else:
        processing_result = process_data_with_pipeline(
            df,
            processor_df=processor_df,
            pipeline_run_id=pipeline_run_id,
            test_mode=args.test_mode,
        )
        processing_result["pipeline_run_id"] = pipeline_run_id
        processing_result["timestamp"] = datetime.now().isoformat()
    results["processing"] = processing_result

    if processing_result.get("status") != "success":
        raise RuntimeError(f"Processing failed: {processing_result.get('error', 'Unknown error')}")

    # Step 3: Loading/consistency validation
    if args.test_mode:
        loading_result = {
            "status": "success",
            "method": "test_validation",
            "pipeline_run_id": pipeline_run_id,
            "timestamp": datetime.now().isoformat(),
            "records_processed": processing_result.get("records_processed", 0),
            "records_inserted": processing_result.get("records_inserted", 0),
            "records_updated": processing_result.get("records_updated", 0),
            "test_mode": True,
        }
    else:
        validation = validate_processing_results(processing_result)
        loading_result = {
            "status": validation.get("status", "failed"),
            "method": "validation_only",
            "pipeline_run_id": pipeline_run_id,
            "timestamp": datetime.now().isoformat(),
            "validation": validation,
        }
        if validation.get("status") == "success":
            loading_result.update(
                {
                    "records_processed": validation.get("records_processed", 0),
                    "records_inserted": validation.get("records_inserted", 0),
                    "records_updated": validation.get("records_updated", 0),
                    "total_loaded": validation.get("total_loaded", 0),
                    "consistency_validation": validate_database_consistency(pipeline_run_id),
                }
            )
        else:
            loading_result["error"] = validation.get("error", "Validation failed")
    results["loading"] = loading_result

    if loading_result.get("status") not in {"success", "warning"}:
        raise RuntimeError(f"Loading validation failed: {loading_result.get('error', 'Unknown error')}")

    # Step 4: Top searched
    if args.skip_top_searched:
        top_result = {
            "status": "skipped",
            "pipeline_run_id": pipeline_run_id,
            "timestamp": datetime.now().isoformat(),
            "phones_updated": 0,
            "method": "skipped_by_flag",
        }
    else:
        top_result = run_top_searched_pipeline(
            pipeline_run_id=pipeline_run_id,
            test_mode=args.test_mode,
            limit=args.top_limit,
        )
    results["top_searched"] = top_result

    if top_result.get("status") != "success" and args.strict_top_searched:
        raise RuntimeError(f"Top searched step failed: {top_result.get('error', 'Unknown error')}")

    results["finished_at"] = datetime.now().isoformat()
    results["execution_time_seconds"] = round(time.time() - start_time, 2)

    top_ok = top_result.get("status") in {"success", "skipped"} or not args.strict_top_searched
    results["overall_status"] = "success" if top_ok else "partial"
    return results


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manual end-to-end pipeline runner")
    parser.add_argument("--max-pages", type=int, default=10, help="Maximum listing pages to scrape")
    parser.add_argument("--pipeline-run-id", type=str, default="", help="Optional custom run ID")
    parser.add_argument("--test-mode", type=as_bool, default=False, help="Run in test mode")
    parser.add_argument(
        "--skip-processor-rankings",
        type=as_bool,
        default=False,
        help="Skip processor rankings refresh",
    )
    parser.add_argument(
        "--force-processor-refresh",
        type=as_bool,
        default=False,
        help="Force refresh processor rankings cache",
    )
    parser.add_argument(
        "--skip-top-searched",
        type=as_bool,
        default=False,
        help="Skip top searched update",
    )
    parser.add_argument(
        "--strict-top-searched",
        type=as_bool,
        default=False,
        help="Fail run if top searched step fails",
    )
    parser.add_argument("--top-limit", type=int, default=10, help="Top searched phone limit")
    parser.add_argument(
        "--output",
        type=str,
        default="",
        help="Optional JSON output path (default: pipeline/cache/manual_run_<id>.json)",
    )
    parser.add_argument("--log-level", type=str, default="INFO", help="Logging level")
    return parser


def main() -> None:
    load_dotenv()
    parser = build_parser()
    args = parser.parse_args()
    setup_logging(args.log_level)

    ensure_required_env()

    try:
        results = json_safe(run_pipeline(args))
        run_id = results["pipeline_run_id"]

        output_path = (
            Path(args.output)
            if args.output
            else PROJECT_ROOT / "pipeline" / "cache" / f"manual_run_{run_id}.json"
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

        logger.info("Run completed with status: %s", results.get("overall_status"))
        logger.info("Summary written to: %s", output_path)
        print(json.dumps(results, indent=2))
        sys.exit(0)
    except Exception as exc:
        logger.error("Pipeline run failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
