"""Background poller that broadcasts quote updates via WebSocket."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

from fastapi import WebSocket

from .b3_client import ASSET_CLASSES, DerivativeQuote
from .providers.base import DataProvider

logger = logging.getLogger(__name__)


class QuoteBroadcaster:
    def __init__(self, provider: DataProvider, poll_interval: float = 15.0) -> None:
        self._provider = provider
        self._poll_interval = poll_interval
        self._clients: set[WebSocket] = set()
        self._task: asyncio.Task | None = None
        self._latest_quotes: list[dict] = []
        self._price_history: dict[str, list[dict]] = {}  # ticker -> [{time, price}]

    @property
    def latest_quotes(self) -> list[dict]:
        return self._latest_quotes

    @property
    def price_history(self) -> dict[str, list[dict]]:
        return self._price_history

    def start(self) -> None:
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("Broadcaster started (interval=%.0fs)", self._poll_interval)

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Broadcaster stopped")

    def add_client(self, ws: WebSocket) -> None:
        self._clients.add(ws)
        logger.info("WS client connected (%d total)", len(self._clients))

    def remove_client(self, ws: WebSocket) -> None:
        self._clients.discard(ws)
        logger.info("WS client disconnected (%d total)", len(self._clients))

    async def _poll_loop(self) -> None:
        while True:
            try:
                quotes = await self._provider.get_all_quotes(min_open_interest=100)
                now = datetime.now().isoformat(timespec="seconds")

                self._latest_quotes = [q.to_dict() for q in quotes]

                # Accumulate price history for intraday charts
                for q in quotes:
                    price = q.last_price or q.bid
                    if price is not None:
                        if q.ticker not in self._price_history:
                            self._price_history[q.ticker] = []
                        hist = self._price_history[q.ticker]
                        # Only add if price changed or first entry
                        if not hist or hist[-1]["price"] != price:
                            hist.append({"time": now, "price": price})
                        # Keep last 500 points per ticker
                        if len(hist) > 500:
                            self._price_history[q.ticker] = hist[-500:]

                payload = json.dumps({
                    "type": "quotes",
                    "data": self._latest_quotes,
                    "total": len(self._latest_quotes),
                    "timestamp": now,
                })

                await self._broadcast(payload)

            except Exception:
                logger.exception("Poll error")

            await asyncio.sleep(self._poll_interval)

    async def _broadcast(self, message: str) -> None:
        if not self._clients:
            return

        dead: list[WebSocket] = []
        for ws in self._clients:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self._clients.discard(ws)
