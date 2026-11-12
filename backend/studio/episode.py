"""The data model shared by the script builders and the renderer."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class Scene:
    """One beat of a video: a visual layout plus the line read over it.

    ``kind`` picks the layout in :mod:`studio.visuals` (title, stat, trend,
    bars, map, incident, points, steps, outro); ``data`` is that layout's
    payload.
    """

    kind: str
    narration: str
    data: Dict[str, Any] = field(default_factory=dict)
    min_seconds: float = 3.0


@dataclass
class Episode:
    format: str
    aspect: str                      # "16:9" or "9:16"
    slug: str
    show: str                        # programme name shown on every frame
    title: str                       # YouTube title
    description: str
    tags: List[str]
    thumbnail: Dict[str, Any]        # headline, kicker, badge, color
    scenes: List[Scene]
    sources: List[Dict[str, str]] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)   # reviewer warnings

    @property
    def vertical(self) -> bool:
        return self.aspect == "9:16"
