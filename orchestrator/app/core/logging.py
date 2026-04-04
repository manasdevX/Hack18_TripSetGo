"""
Structured logging configuration for the Orchestrator.
"""
import logging
import sys
import time
from contextlib import contextmanager
from typing import Generator


LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"


def configure_logging(debug: bool = False) -> None:
    level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        datefmt=DATE_FORMAT,
        stream=sys.stdout,
    )
    # Silence noisy third-party loggers
    for noisy in ("httpx", "httpcore", "uvicorn.access"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


@contextmanager
def timed(logger: logging.Logger, label: str) -> Generator[None, None, None]:
    """Context manager that logs elapsed time for a block."""
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(f"[TIMER] {label} completed in {elapsed_ms:.2f}ms")
