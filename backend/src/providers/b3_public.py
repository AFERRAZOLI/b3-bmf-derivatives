"""B3 public API provider (cotacao.b3.com.br). ~15 min delay, no auth."""

from __future__ import annotations

from ..b3_client import B3Client, DerivativeQuote
from .base import DataProvider


class B3PublicProvider(DataProvider):
    def __init__(self, timeout: float = 30.0) -> None:
        self._client = B3Client(timeout=timeout)

    async def start(self) -> None:
        pass  # httpx client is created on init

    async def stop(self) -> None:
        await self._client.close()

    async def get_all_quotes(
        self,
        asset_classes: list[str] | None = None,
        tickers_filter: list[str] | None = None,
        min_open_interest: int = 0,
    ) -> list[DerivativeQuote]:
        return await self._client.get_all_quotes(
            asset_classes=asset_classes,
            tickers_filter=tickers_filter,
            min_open_interest=min_open_interest,
        )
