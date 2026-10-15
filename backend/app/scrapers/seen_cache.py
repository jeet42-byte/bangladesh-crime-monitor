"""Remember which article URLs a previous run already sent to the model.

The cron runs every 30 minutes with a lookback several times longer than
that, so without memory each article is re-extracted on every run until it
ages out of the window - roughly six model calls for one story. Duplicates
were only discarded at insert time, after the quota had been spent. This file
persists across runs (the workflow restores and saves it through the Actions
cache) so the quota goes to articles nobody has looked at yet.

Only final answers are recorded: an article the model actually read, whether
it turned out to be a crime report or not. One that failed because the model
was unreachable stays unrecorded and is tried again next run.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

#: Comfortably longer than any lookback the cron uses; older entries can no
#: longer reappear in a feed window, so keeping them only grows the file.
RETENTION = timedelta(days=10)


class SeenCache:
    def __init__(self, path: Optional[Path]) -> None:
        self.path = path
        self._entries: Dict[str, str] = {}
        if path is not None and path.exists():
            try:
                self._entries = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError) as exc:
                # A corrupt cache costs one run of repeat extractions, nothing more.
                logger.warning("ignoring unreadable seen-cache %s: %s", path, exc)
        self._prune()
        self.loaded = len(self._entries)

    def _prune(self) -> None:
        cutoff = datetime.now(timezone.utc) - RETENTION
        kept = {}
        for url, stamp in self._entries.items():
            try:
                if datetime.fromisoformat(stamp) >= cutoff:
                    kept[url] = stamp
            except ValueError:
                continue
        self._entries = kept

    def __contains__(self, url: object) -> bool:
        return url in self._entries

    def add(self, url: str) -> None:
        if url:
            self._entries[url] = datetime.now(timezone.utc).isoformat()

    @property
    def added(self) -> int:
        return len(self._entries) - self.loaded

    def save(self) -> None:
        if self.path is None:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._entries), encoding="utf-8")
        logger.info(
            "seen-cache: %d urls (%d new) -> %s", len(self._entries), self.added, self.path
        )
