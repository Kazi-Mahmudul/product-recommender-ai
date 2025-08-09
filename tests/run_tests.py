#!/usr/bin/env python3
"""
Test runner script for Contextual Query Enhancement system
"""
import sys
import subprocess
import argparse
import os
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: {description} failed with exit code {e.returncode}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return False


def main():
    """Main test runner function"""
    parser = argparse.ArgumentParser(description="Run contextual query tests")
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests only")
    parser.add_argument("--e2e", action="store_true", help="Run end-to-end tests only")
    parser.add_argument("--performance", action="store_true", help="Run performance tests only")
    parser.add_argument("--coverage", action="store_true", help="Run tests with coverage report")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--fast", action="store_true", help="Skip slow tests")
    parser.add_argument("--parallel", "-n", type=int, help="Number of parallel workers")
    parser.add_argument("--file", help="Run specific test file")
    parser.add_argument("--function", help="Run specific test function")
    
    args = parser.parse_args()
    
    # Change to project root directory
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    # Base pytest command
    pytest_cmd = ["python", "-m", "pytest"]
    
    # Add verbosity
    if args.verbose:
        pytest_cmd.extend(["-v", "-s"])
    else:
        pytest_cmd.append("-q")
    
    # Add parallel execution
    if args.parallel:
        pytest_cmd.extend(["-n", str(args.parallel)])
    
    # Add coverage
    if args.coverage:
        pytest_cmd.extend([
            "--cov=app",
            "--cov-report=html:htmlcov",
            "--cov-report=term-missing",
            "--cov-report=xml"
        ])
    
    # Skip slow tests if requested
    if args.fast:
        pytest_cmd.extend(["-m", "not slow"])
    
    # Determine which tests to run
    test_paths = []
    markers = []
    
    if args.unit:
        markers.append("unit")
    if args.integration:
        markers.append("integration")
    if args.e2e:
        markers.append("e2e")
    if args.performance:
        markers.append("performance")
    
    if markers:
        pytest_cmd.extend(["-m", " or ".join(markers)])
    
    # Specific file or function
    if args.file:
        test_paths.append(f"tests/{args.file}")
        if args.function:
            test_paths[-1] += f"::{args.function}"
    elif not markers:
        # Run all tests if no specific category selected
        test_paths.append("tests/")
    
    # Add test paths to command
    pytest_cmd.extend(test_paths)
    
    # Run the tests
    success = True
    
    # Install dependencies first
    print("Installing test dependencies...")
    install_cmd = ["pip", "install", "-r", "requirements-test.txt"]
    if not run_command(install_cmd, "Installing test dependencies"):
        return 1
    
    # Run linting if not running specific tests
    if not args.file and not args.function:
        print("\nRunning code quality checks...")
        
        # Run flake8
        flake8_cmd = ["flake8", "app/", "tests/", "--max-line-length=120", "--ignore=E203,W503"]
        if not run_command(flake8_cmd, "Code style check (flake8)"):
            success = False
        
        # Run black check
        black_cmd = ["black", "--check", "--diff", "app/", "tests/"]
        if not run_command(black_cmd, "Code formatting check (black)"):
            success = False
        
        # Run isort check
        isort_cmd = ["isort", "--check-only", "--diff", "app/", "tests/"]
        if not run_command(isort_cmd, "Import sorting check (isort)"):
            success = False
    
    # Run the actual tests
    if not run_command(pytest_cmd, "Running tests"):
        success = False
    
    # Generate test report summary
    if args.coverage:
        print("\n" + "="*60)
        print("Coverage report generated in htmlcov/index.html")
        print("="*60)
    
    # Run security checks if running all tests
    if not args.file and not args.function and not args.unit:
        print("\nRunning security checks...")
        
        # Run bandit security check
        bandit_cmd = ["bandit", "-r", "app/", "-f", "json", "-o", "bandit-report.json"]
        run_command(bandit_cmd, "Security check (bandit)")
        
        # Run safety check for dependencies
        safety_cmd = ["safety", "check", "--json", "--output", "safety-report.json"]
        run_command(safety_cmd, "Dependency security check (safety)")
    
    # Performance benchmarking
    if args.performance or (not args.file and not args.function):
        print("\nRunning performance benchmarks...")
        benchmark_cmd = ["python", "-m", "pytest", "tests/performance/", "-v", "--benchmark-only"]
        run_command(benchmark_cmd, "Performance benchmarks")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())