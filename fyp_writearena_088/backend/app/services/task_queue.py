"""A small, dependency-free background task queue.

WriteArena doesn't have Celery/Redis in its stack (this is a single-process,
local-dev-oriented app — see the architecture note in SETUP.md), so this
uses a bounded ThreadPoolExecutor instead of raw `threading.Thread` per
submission. That fixes two real problems the old code had:

  - Unbounded thread creation: a room where everyone submits within the same
    few seconds used to spin up one raw, unmanaged thread per submission
    with no cap at all.
  - Silent failure: an exception inside the background thread just
    vanished — no retry, no record, nothing. The Results page would poll
    forever for a score that was never coming.

Failures here are retried a few times with backoff and, if every attempt
still fails, recorded in the FailedJob table so they're at least queryable
afterward instead of disappearing outright.

This is not a substitute for a real task queue (Celery + Redis, etc.) if
the app ever needs to run as more than one process — see SETUP.md.
"""
import logging
import time
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("writearena.tasks")

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="wa-task")

MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 2


def submit(fn, *args, on_permanent_failure=None, **kwargs):
    """Run fn(*args, **kwargs) on the bounded pool, retrying up to
    MAX_ATTEMPTS times with backoff on exception. If every attempt fails,
    on_permanent_failure(exc) is called (synchronously, on the worker
    thread) so the caller can persist a record of the failure."""
    def _run_with_retry():
        last_exc = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                fn(*args, **kwargs)
                return
            except Exception as exc:
                last_exc = exc
                logger.warning("task failed (attempt %d/%d): %s", attempt, MAX_ATTEMPTS, exc, exc_info=True)
                if attempt < MAX_ATTEMPTS:
                    time.sleep(RETRY_BACKOFF_SECONDS * attempt)
        logger.error("task permanently failed after %d attempts: %s", MAX_ATTEMPTS, last_exc, exc_info=True)
        if on_permanent_failure:
            try:
                on_permanent_failure(last_exc)
            except Exception:
                logger.exception("on_permanent_failure handler itself raised")
    _executor.submit(_run_with_retry)
