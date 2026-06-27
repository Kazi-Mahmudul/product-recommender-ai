#!/usr/bin/env python3
"""
MobileDokan scraper used by the GitHub Actions data pipeline.

This module keeps the public interface stable (`MobileDokanScraper`, `get_product_links`,
`get_product_specs`, `extract_price`, `headers`) while simplifying internals:
- explicit listing-page parsing
- robust pagination via rel=next
- detail-page parsing with deterministic selectors
- detail-first price extraction with listing fallback
- straightforward database upsert logic
"""

from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import parse_qs, urljoin, urlparse

import pandas as pd
import psycopg2
import requests
import urllib3
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

BASE_URL = "https://www.mobiledokan.com"
LISTING_URL = f"{BASE_URL}/mobile-price-list"

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

STANDARD_COLUMNS = [
    "name",
    "brand",
    "model",
    "price",
    "url",
    "img_url",
    "display_type",
    "screen_size_inches",
    "display_resolution",
    "pixel_density_ppi",
    "refresh_rate_hz",
    "screen_protection",
    "display_brightness",
    "aspect_ratio",
    "hdr_support",
    "chipset",
    "cpu",
    "gpu",
    "ram",
    "ram_type",
    "internal_storage",
    "storage_type",
    "camera_setup",
    "primary_camera_resolution",
    "selfie_camera_resolution",
    "main_camera",
    "front_camera",
    "primary_camera_video_recording",
    "selfie_camera_video_recording",
    "primary_camera_ois",
    "primary_camera_aperture",
    "selfie_camera_aperture",
    "camera_features",
    "autofocus",
    "flash",
    "settings",
    "zoom",
    "shooting_modes",
    "video_fps",
    "battery_type",
    "capacity",
    "quick_charging",
    "wireless_charging",
    "reverse_charging",
    "build",
    "weight",
    "thickness",
    "colors",
    "waterproof",
    "ip_rating",
    "ruggedness",
    "network",
    "speed",
    "sim_slot",
    "volte",
    "bluetooth",
    "wlan",
    "gps",
    "nfc",
    "usb",
    "usb_otg",
    "fingerprint_sensor",
    "finger_sensor_type",
    "finger_sensor_position",
    "face_unlock",
    "light_sensor",
    "infrared",
    "fm_radio",
    "operating_system",
    "os_version",
    "user_interface",
    "status",
    "made_by",
    "release_date",
]

DETAIL_KEY_ALIASES = {
    "screen_size": "screen_size_inches",
    "pixel_density": "pixel_density_ppi",
    "usb_type_c": "usb",
    "fingerprint_sensor": "fingerprint_sensor",
    "battery_type": "battery_type",
    "operating_system": "operating_system",
    "release_date": "release_date",
    "made_by": "made_by",
}

POPULAR_BRANDS = [
    "Samsung",
    "iPhone",
    "Apple",
    "Xiaomi",
    "Oppo",
    "Vivo",
    "Realme",
    "OnePlus",
    "Huawei",
    "Honor",
    "Nokia",
    "Motorola",
    "Sony",
    "LG",
    "Infinix",
    "Tecno",
    "Itel",
    "Symphony",
    "Walton",
]


@dataclass
class ListingProduct:
    url: str
    name: Optional[str]
    price: Optional[str]
    price_type: Optional[str]


class RateLimiter:
    """Simple per-minute request limiter."""

    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.request_times: List[float] = []

    def wait(self) -> None:
        if self.requests_per_minute <= 0:
            return

        now = time.time()
        self.request_times = [t for t in self.request_times if now - t < 60]

        if len(self.request_times) >= self.requests_per_minute:
            sleep_seconds = 60 - (now - self.request_times[0])
            if sleep_seconds > 0:
                time.sleep(sleep_seconds)

        self.request_times.append(time.time())


def sanitize_key(key: str, prefix: str = "") -> str:
    key = str(key).strip().lower().replace(" ", "_")
    key = "".join(ch for ch in key if ch.isalnum() or ch == "_")
    return f"{prefix}_{key}" if prefix else key


def _clean_price_label(raw_value: Optional[str]) -> Optional[str]:
    if raw_value is None:
        return None

    cleaned = str(raw_value).replace("(", "").replace(")", "").strip()
    if not cleaned:
        return None
    return re.sub(r"\s+", " ", cleaned)


def _normalize_price(raw_value: Optional[str]) -> Optional[str]:
    if raw_value is None:
        return None

    value = str(raw_value).strip()
    if not value:
        return None

    value = (
        value.replace("৳", "")
        .replace("Tk", "")
        .replace("tk", "")
        .replace("BDT", "")
        .replace("Ã Â§Â³", "")
        .replace("à§³", "")
        .replace("ÃƒÂ Ã‚Â§Ã‚Â³", "")
        .strip()
    )

    value = re.sub(r"^\.+", "", value)

    # Prioritize thousand-grouped numbers first, then plain integer tokens.
    for pattern in (r"(\d{1,3}(?:,\d{3})+)", r"(\d{4,})", r"(\d{1,3})"):
        match = re.search(pattern, value)
        if match:
            return match.group(1)

    return None


def _format_price(price: Optional[str], label: Optional[str]) -> Optional[str]:
    if not price:
        return None

    clean_label = _clean_price_label(label)
    if clean_label:
        return f"{price} ({clean_label})"
    return price


def _request_html(
    session: requests.Session,
    url: str,
    *,
    timeout: int = 30,
    max_retries: int = 3,
    backoff_seconds: float = 1.5,
    rate_limiter: Optional[RateLimiter] = None,
) -> str:
    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            if rate_limiter:
                rate_limiter.wait()

            response = session.get(url, headers=headers, verify=False, timeout=timeout)
            response.raise_for_status()
            return response.text
        except requests.RequestException as exc:
            last_error = exc
            if attempt == max_retries:
                break
            sleep_seconds = backoff_seconds * attempt
            logger.warning(
                "Request failed (%s/%s) for %s: %s. Retrying in %.1fs",
                attempt,
                max_retries,
                url,
                exc,
                sleep_seconds,
            )
            time.sleep(sleep_seconds)

    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def parse_phone_title(title: str) -> Tuple[str, str]:
    if not title:
        return "Unknown", "Unknown"

    title = title.strip()
    for brand in POPULAR_BRANDS:
        if re.search(rf"\b{re.escape(brand)}\b", title, flags=re.IGNORECASE):
            model = re.sub(rf"\b{re.escape(brand)}\b", "", title, flags=re.IGNORECASE).strip()
            model = re.sub(r"\s+", " ", model)
            return brand, model or title

    parts = title.split()
    if not parts:
        return "Unknown", "Unknown"
    if len(parts) == 1:
        return parts[0], parts[0]
    return parts[0], " ".join(parts[1:])


def extract_listing_products(soup: BeautifulSoup) -> List[ListingProduct]:
    products: List[ListingProduct] = []
    seen_urls: Set[str] = set()

    for card in soup.select(".product-box"):
        link = card.select_one('a[href*="/mobile/"]')
        if not link:
            continue

        href = link.get("href")
        if not href:
            continue

        product_url = urljoin(BASE_URL, href)
        if "/mobile/" not in product_url or product_url in seen_urls:
            continue

        name_node = card.select_one(".product-title")
        name = name_node.get_text(" ", strip=True) if name_node else None

        price_node = card.select_one(".price-div .product-price")
        listing_price = _normalize_price(price_node.get_text(" ", strip=True) if price_node else None)

        price_type_node = card.select_one(".price-div .pricetype")
        price_type = _clean_price_label(price_type_node.get_text(" ", strip=True) if price_type_node else None)

        products.append(
            ListingProduct(
                url=product_url,
                name=name,
                price=listing_price,
                price_type=price_type,
            )
        )
        seen_urls.add(product_url)

    return products


def _current_page_number(url: str) -> int:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    page_values = query.get("page", [])
    if not page_values:
        return 1
    try:
        return int(page_values[0])
    except (ValueError, TypeError):
        return 1


def extract_next_page_url(soup: BeautifulSoup, current_url: str) -> Optional[str]:
    next_link = soup.select_one('a[rel~="next"]')
    if next_link and next_link.get("href"):
        return urljoin(BASE_URL, next_link["href"])

    current_page = _current_page_number(current_url)
    candidate_pages: Dict[int, str] = {}

    for a_tag in soup.select('a[href*="page="]'):
        href = a_tag.get("href")
        if not href:
            continue
        absolute = urljoin(BASE_URL, href)
        page_number = _current_page_number(absolute)
        if page_number > current_page:
            candidate_pages[page_number] = absolute

    if not candidate_pages:
        return None

    return candidate_pages[min(candidate_pages.keys())]


def _extract_key_specs(soup: BeautifulSoup, specs: Dict[str, Optional[str]]) -> None:
    for info in soup.select(".key-specs .info"):
        spans = info.select(".text span")
        if len(spans) < 2:
            continue

        label = spans[0].get_text(" ", strip=True).lower()
        value = spans[1].get_text(" ", strip=True)
        if not value:
            continue

        if "main camera" in label or "rear camera" in label or "primary camera" in label:
            specs["main_camera"] = specs["main_camera"] or value
            specs["primary_camera_resolution"] = specs["primary_camera_resolution"] or value
        elif "front camera" in label or "selfie" in label:
            specs["front_camera"] = specs["front_camera"] or value
            specs["selfie_camera_resolution"] = specs["selfie_camera_resolution"] or value
        elif "storage" in label:
            specs["internal_storage"] = specs["internal_storage"] or value
        elif label == "ram" or " ram" in label:
            specs["ram"] = specs["ram"] or value
        elif "display" in label:
            specs["display_resolution"] = specs["display_resolution"] or value
        elif "battery" in label:
            specs["capacity"] = specs["capacity"] or value


def _extract_row_pairs(table: BeautifulSoup) -> List[Tuple[str, str]]:
    pairs: List[Tuple[str, str]] = []
    for row in table.select("tr"):
        cells = row.find_all("td")
        if len(cells) != 2:
            continue
        key = sanitize_key(cells[0].get_text(" ", strip=True))
        value = cells[1].get_text(" ", strip=True)
        if key and value:
            pairs.append((key, value))
    return pairs


def _apply_camera_pair(
    key: str,
    value: str,
    specs: Dict[str, Optional[str]],
    *,
    camera_type: str,
) -> None:
    is_selfie = camera_type == "selfie"

    if key == "resolution":
        target = "selfie_camera_resolution" if is_selfie else "primary_camera_resolution"
        specs[target] = value

        if is_selfie:
            specs["front_camera"] = value
        else:
            specs["main_camera"] = value
        return

    if key == "video":
        target = "selfie_camera_video_recording" if is_selfie else "primary_camera_video_recording"
        specs[target] = value
        return

    if key == "aperture":
        target = "selfie_camera_aperture" if is_selfie else "primary_camera_aperture"
        specs[target] = value
        return

    if not is_selfie:
        mapping = {
            "camera_setup": "camera_setup",
            "autofocus": "autofocus",
            "flash": "flash",
            "ois": "primary_camera_ois",
            "features": "camera_features",
            "settings": "settings",
            "zoom": "zoom",
            "shooting_modes": "shooting_modes",
            "fps": "video_fps",
            "video": "primary_camera_video_recording",
        }
        target = mapping.get(key)
        if target and target in specs:
            specs[target] = value


def extract_detail_specs(soup: BeautifulSoup) -> Dict[str, Optional[str]]:
    specs = {col: None for col in STANDARD_COLUMNS if col not in {"name", "brand", "model", "price", "url", "img_url"}}

    _extract_key_specs(soup, specs)

    for group in soup.select(".row.mb-2.pb-2.border-bottom"):
        group_title_node = group.select_one("h3.text-bold")
        group_title = group_title_node.get_text(" ", strip=True).lower() if group_title_node else ""

        subgroups = group.select(".subgroup")
        tables = group.select("table.spec-grp-tbl")

        if "camera" in group_title and subgroups:
            for index, subgroup in enumerate(subgroups):
                if index >= len(tables):
                    continue

                header = subgroup.get_text(" ", strip=True).lower()
                camera_type = "selfie" if ("selfie" in header or "front" in header) else "primary"
                for key, value in _extract_row_pairs(tables[index]):
                    _apply_camera_pair(key, value, specs, camera_type=camera_type)

        for table in tables:
            for key, value in _extract_row_pairs(table):
                mapped_key = DETAIL_KEY_ALIASES.get(key, key)
                if mapped_key in specs:
                    # Detailed spec tables are the most explicit source of truth.
                    specs[mapped_key] = value

    return specs


def extract_price(
    soup: BeautifulSoup,
    fallback_price: Optional[str] = None,
    fallback_price_type: Optional[str] = None,
) -> Optional[str]:
    """
    Extract price from a detail/listing soup.

    Source priority:
    1) structured offer metadata (if available)
    2) detail page price block
    3) listing page card price
    4) caller-provided fallback (listing context)
    """

    price_label_node = soup.select_one(".short-info .price-and-variant .text-danger")
    detail_price_label = _clean_price_label(
        price_label_node.get_text(" ", strip=True) if price_label_node else None
    )

    meta_price = soup.select_one('[itemprop="offers"] meta[itemprop="price"]')
    if meta_price and meta_price.get("content"):
        normalized = _normalize_price(meta_price.get("content"))
        if normalized:
            return _format_price(normalized, detail_price_label)

    detail_selectors = [
        ".short-info .price-and-variant .text-primary.fw-bold.fs-6",
        ".short-info .price-and-variant .text-primary.fw-bold",
        ".short-info .price-and-variant [class*='text-primary']",
        ".short-info .price-and-variant",
    ]

    for selector in detail_selectors:
        node = soup.select_one(selector)
        if not node:
            continue

        normalized = _normalize_price(node.get_text(" ", strip=True))
        if normalized:
            return _format_price(normalized, detail_price_label)

    # Listing-card selector should only be used when parsing listing HTML directly.
    if not soup.select_one(".short-info"):
        listing_node = soup.select_one(".price-div .product-price")
        if listing_node:
            normalized = _normalize_price(listing_node.get_text(" ", strip=True))
            if normalized:
                return _format_price(normalized, None)

    if fallback_price:
        return _format_price(_normalize_price(fallback_price), fallback_price_type)

    return None


def parse_product_detail_soup(
    soup: BeautifulSoup,
    *,
    url: str,
    listing_name: Optional[str] = None,
    listing_price: Optional[str] = None,
    listing_price_type: Optional[str] = None,
) -> Dict[str, Any]:
    name_node = soup.select_one("#product-specs h2") or soup.select_one("h1")
    name = None
    if name_node:
        raw_name = name_node.get_text(" ", strip=True)
        name = re.sub(r"\bFull Specifications\b", "", raw_name, flags=re.IGNORECASE).strip()

    if not name:
        name = listing_name

    specs = extract_detail_specs(soup)

    brand = specs.get("brand")
    model = specs.get("model")

    if not brand or not model:
        parsed_brand, parsed_model = parse_phone_title(name or "")
        brand = brand or parsed_brand
        model = model or parsed_model

    image_node = soup.select_one('img[itemprop="image"]')
    image_url = image_node.get("src") if image_node else None

    price = extract_price(
        soup,
        fallback_price=listing_price,
        fallback_price_type=listing_price_type,
    )

    specs["brand"] = brand
    specs["model"] = model

    return {
        "name": name,
        "brand": brand,
        "model": model,
        "price": price,
        "image_url": image_url,
        "specs": specs,
        "url": url,
    }


def get_product_links(page: int = 1) -> List[str]:
    """Backward-compatible helper used by older scripts."""
    page_url = f"{LISTING_URL}?type=mobile&page={page}"

    session = requests.Session()
    session.headers.update(headers)

    try:
        html = _request_html(session, page_url)
    except Exception as exc:
        logger.error("Failed to fetch listing page %s: %s", page, exc)
        return []

    soup = BeautifulSoup(html, "html.parser")
    products = extract_listing_products(soup)
    return [p.url for p in products]


def get_product_specs(
    url: str,
    rate_limiter: Optional[RateLimiter] = None,
    *,
    session: Optional[requests.Session] = None,
    listing_name: Optional[str] = None,
    listing_price: Optional[str] = None,
    listing_price_type: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Fetch and parse one product detail page."""

    http = session or requests.Session()
    if "User-Agent" not in http.headers:
        http.headers.update(headers)

    try:
        html = _request_html(http, url, rate_limiter=rate_limiter)
        soup = BeautifulSoup(html, "html.parser")

        parsed = parse_product_detail_soup(
            soup,
            url=url,
            listing_name=listing_name,
            listing_price=listing_price,
            listing_price_type=listing_price_type,
        )

        if not parsed.get("name") or not parsed.get("brand"):
            logger.warning("Incomplete product identity for %s", url)

        return parsed
    except Exception as exc:
        logger.error("Error scraping product %s: %s", url, exc)
        return None


class MobileDokanScraper:
    """Main scraper class used by the GitHub Actions pipeline."""

    def __init__(self, database_url: Optional[str] = None, requests_per_minute: int = 30):
        self.database_url = database_url
        self.rate_limiter = RateLimiter(requests_per_minute=requests_per_minute)
        self.session = requests.Session()
        self.session.headers.update(headers)
        self._valid_columns_cache: Optional[Set[str]] = None

    def get_database_connection(self):
        if not self.database_url:
            self.database_url = os.getenv("DATABASE_URL") or os.getenv("LOCAL_DATABASE_URL")

        if not self.database_url:
            raise ValueError(
                "No database URL found. Set DATABASE_URL or LOCAL_DATABASE_URL environment variable."
            )

        db_url = self.database_url
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)

        return psycopg2.connect(db_url)

    def get_valid_database_columns(self) -> Set[str]:
        if self._valid_columns_cache is not None:
            return self._valid_columns_cache

        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'phones'
                """
            )
            self._valid_columns_cache = {row[0] for row in cursor.fetchall()}
            conn.close()
        except Exception as exc:
            logger.error("Failed to read phone table schema: %s", exc)
            self._valid_columns_cache = set(STANDARD_COLUMNS) | {
                "created_at",
                "updated_at",
                "scraped_at",
                "pipeline_run_id",
                "data_source",
                "is_pipeline_managed",
            }

        return self._valid_columns_cache

    def get_existing_urls_with_dates(self) -> Dict[str, Optional[datetime]]:
        try:
            conn = self.get_database_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT url, scraped_at
                FROM phones
                WHERE url IS NOT NULL
                """
            )
            existing = {row[0]: row[1] for row in cursor.fetchall()}
            conn.close()
            return existing
        except Exception as exc:
            logger.error("Failed to load existing URLs: %s", exc)
            return {}

    def scrape_listing_catalog(self, max_pages: Optional[int] = None) -> Tuple[List[ListingProduct], int, int, str]:
        products: List[ListingProduct] = []
        seen_urls: Set[str] = set()

        pages_checked = 0
        pages_with_products = 0
        detection_method = "no_pages"

        next_page_url: Optional[str] = LISTING_URL

        while next_page_url:
            if max_pages is not None and pages_checked >= max_pages:
                detection_method = "max_pages"
                break

            pages_checked += 1

            try:
                html = _request_html(
                    self.session,
                    next_page_url,
                    rate_limiter=self.rate_limiter,
                )
            except Exception as exc:
                logger.error("Failed to fetch listing page %s: %s", next_page_url, exc)
                detection_method = "request_error"
                break

            soup = BeautifulSoup(html, "html.parser")
            page_products = extract_listing_products(soup)

            if not page_products:
                detection_method = "empty_page"
                break

            pages_with_products += 1

            for product in page_products:
                if product.url in seen_urls:
                    continue
                products.append(product)
                seen_urls.add(product.url)

            inferred_next = extract_next_page_url(soup, next_page_url)
            if inferred_next and inferred_next != next_page_url:
                next_page_url = inferred_next
                detection_method = "rel_next"
            else:
                next_page_url = None
                detection_method = "no_next_link"

        return products, pages_checked, pages_with_products, detection_method

    def scrape_and_store(
        self,
        max_pages: Optional[int] = None,
        pipeline_run_id: Optional[str] = None,
        check_updates: bool = True,
        batch_size: int = 50,
    ) -> Dict[str, Any]:
        if pipeline_run_id is None:
            pipeline_run_id = f"scraper_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        logger.info("Starting MobileDokan scrape (run_id=%s)", pipeline_run_id)

        listing_products, pages_checked, pages_with_products, detection_method = self.scrape_listing_catalog(
            max_pages=max_pages
        )

        total_links_found = len(listing_products)
        if total_links_found == 0:
            return {
                "status": "success",
                "pipeline_run_id": pipeline_run_id,
                "pages_checked": pages_checked,
                "pages_scraped": pages_with_products,
                "pages_with_products": pages_with_products,
                "detection_method": detection_method,
                "avg_products_per_page": 0.0,
                "total_links_found": 0,
                "new_links_processed": 0,
                "existing_links_checked": 0,
                "phones_skipped": 0,
                "efficiency_percentage": 0.0,
                "products_processed": 0,
                "products_inserted": 0,
                "products_updated": 0,
                "errors": [],
                "error_count": 0,
                "batch_size": batch_size,
                "total_batches": 0,
            }

        avg_products_per_page = round(total_links_found / pages_with_products, 1) if pages_with_products else 0.0

        existing_by_url = self.get_existing_urls_with_dates()
        existing_urls = set(existing_by_url.keys())

        new_products = [p for p in listing_products if p.url not in existing_urls]
        existing_to_check: List[ListingProduct] = []

        if check_updates:
            cutoff = datetime.now() - timedelta(hours=24)
            for product in listing_products:
                if product.url not in existing_urls:
                    continue
                last_scraped_at = existing_by_url.get(product.url)
                if last_scraped_at is None or last_scraped_at < cutoff:
                    existing_to_check.append(product)

        to_process = new_products + existing_to_check
        phones_skipped = total_links_found - len(to_process)
        efficiency_percentage = round((phones_skipped / total_links_found) * 100, 1)

        total_processed = 0
        total_inserted = 0
        total_updated = 0
        total_errors: List[str] = []

        for batch_start in range(0, len(to_process), batch_size):
            batch_products = to_process[batch_start : batch_start + batch_size]

            for product in batch_products:
                parsed = get_product_specs(
                    product.url,
                    self.rate_limiter,
                    session=self.session,
                    listing_name=product.name,
                    listing_price=product.price,
                    listing_price_type=product.price_type,
                )

                if not parsed:
                    total_errors.append(f"Failed to parse product: {product.url}")
                    continue

                status = self.store_product_in_database(parsed, pipeline_run_id=pipeline_run_id)
                if status == "inserted":
                    total_inserted += 1
                    total_processed += 1
                elif status == "updated":
                    total_updated += 1
                    total_processed += 1
                else:
                    total_errors.append(f"Database upsert failed: {product.url}")

        logger.info(
            "MobileDokan scrape complete: processed=%s inserted=%s updated=%s errors=%s",
            total_processed,
            total_inserted,
            total_updated,
            len(total_errors),
        )

        return {
            "status": "success",
            "pipeline_run_id": pipeline_run_id,
            "pages_checked": pages_checked,
            "pages_scraped": pages_with_products,
            "pages_with_products": pages_with_products,
            "detection_method": detection_method,
            "avg_products_per_page": avg_products_per_page,
            "total_links_found": total_links_found,
            "new_links_processed": len(new_products),
            "existing_links_checked": len(existing_to_check),
            "phones_skipped": phones_skipped,
            "efficiency_percentage": efficiency_percentage,
            "products_processed": total_processed,
            "products_inserted": total_inserted,
            "products_updated": total_updated,
            "errors": total_errors,
            "error_count": len(total_errors),
            "batch_size": batch_size,
            "total_batches": (len(to_process) + batch_size - 1) // batch_size,
        }

    def convert_scraped_data_to_dataframe(
        self,
        scraped_data: List[Dict[str, Any]],
        pipeline_run_id: str,
    ) -> pd.DataFrame:
        rows = []

        for product in scraped_data:
            row = {
                "name": product.get("name"),
                "brand": product.get("brand"),
                "model": product.get("model"),
                "price": product.get("price"),
                "url": product.get("url"),
                "img_url": product.get("image_url"),
                "scraped_at": datetime.now(),
                "pipeline_run_id": pipeline_run_id,
                "data_source": "MobileDokan",
                "is_pipeline_managed": True,
            }

            for key, value in (product.get("specs") or {}).items():
                if value is not None:
                    row[key] = value

            rows.append(row)

        return pd.DataFrame(rows)

    def store_product_in_database(self, product_data: Dict[str, Any], pipeline_run_id: Optional[str] = None) -> str:
        try:
            product_url = product_data.get("url")
            if not product_url:
                return "error"

            valid_columns = self.get_valid_database_columns()
            current_time = datetime.now()

            base_data: Dict[str, Any] = {
                "name": product_data.get("name"),
                "brand": product_data.get("brand"),
                "model": product_data.get("model"),
                "price": product_data.get("price"),
                "url": product_url,
                "img_url": product_data.get("image_url"),
                "scraped_at": current_time,
                "pipeline_run_id": pipeline_run_id,
                "data_source": "MobileDokan",
                "is_pipeline_managed": True,
                "updated_at": current_time,
            }

            for key, value in (product_data.get("specs") or {}).items():
                if key in valid_columns and value is not None:
                    base_data[key] = value

            filtered_data = {
                key: value
                for key, value in base_data.items()
                if key in valid_columns and value is not None
            }

            conn = self.get_database_connection()
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM phones WHERE url = %s", (product_url,))
            exists = cursor.fetchone()

            if exists:
                update_fields = []
                update_values: List[Any] = []
                for key, value in filtered_data.items():
                    if key == "url":
                        continue
                    update_fields.append(f"{key} = %s")
                    update_values.append(value)

                if not update_fields:
                    conn.close()
                    return "updated"

                update_values.append(product_url)
                cursor.execute(
                    f"UPDATE phones SET {', '.join(update_fields)} WHERE url = %s",
                    update_values,
                )
                conn.commit()
                conn.close()
                return "updated"

            filtered_data["created_at"] = current_time
            insert_columns = list(filtered_data.keys())
            insert_values = [filtered_data[col] for col in insert_columns]
            placeholders = ", ".join(["%s"] * len(insert_columns))

            cursor.execute(
                f"INSERT INTO phones ({', '.join(insert_columns)}) VALUES ({placeholders})",
                insert_values,
            )
            conn.commit()
            conn.close()
            return "inserted"

        except Exception as exc:
            logger.error("Database store failed for %s: %s", product_data.get("url"), exc)
            return "error"


if __name__ == "__main__":
    scraper = MobileDokanScraper()
    result = scraper.scrape_and_store(max_pages=2)

    print("Scraping completed:")
    print(f"  - Products processed: {result['products_processed']}")
    print(f"  - Products inserted: {result['products_inserted']}")
    print(f"  - Products updated: {result['products_updated']}")
    print(f"  - Errors: {result['error_count']}")
