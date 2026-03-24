"""Abstract base class for market data providers."""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..b3_client import DerivativeQuote


class DataProvider(ABC):
    """Interface for derivative data sources.

    Implementations: B3PublicProvider (free, ~15min delay),
    future: MT5Provider, CedroProvider.
    """

    @abstractmethod
    async def start(self) -> None:
        """Initialize connections."""

    @abstractmethod
    async def stop(self) -> None:
        """Clean up connections."""

    @abstractmethod
    async def get_all_quotes(
        self,
        asset_classes: list[str] | None = None,
        tickers_filter: list[str] | None = None,
        min_open_interest: int = 0,
    ) -> list[DerivativeQuote]:
        """Fetch current quotes."""
