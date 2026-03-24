"""Client for B3's public market data API (cotacao.b3.com.br).

The API returns all contracts for a given asset class (e.g. DI1, DOL, IND).
Data has ~15 min delay during market hours. No authentication required.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

logger = logging.getLogger(__name__)

B3_BASE_URL = "https://cotacao.b3.com.br/mds/api/v1"

# Asset classes to monitor
ASSET_CLASSES: list[str] = ["DI1", "DOL", "WDO", "IND", "WIN"]

ASSET_LABELS = {
    "DI1": "DI Futuro",
    "DOL": "Dólar Futuro",
    "WDO": "Mini Dólar",
    "IND": "Ibovespa Futuro",
    "WIN": "Mini Ibovespa",
    "DDI": "Cupom Cambial",
    "FRC": "FRA de Cupom",
    "DAP": "DI x IPCA",
    "ODF": "Opção s/ DI",
}

MONTH_CODES = {
    "F": "Jan", "G": "Feb", "H": "Mar", "J": "Apr",
    "K": "May", "M": "Jun", "N": "Jul", "Q": "Aug",
    "U": "Sep", "V": "Oct", "X": "Nov", "Z": "Dec",
}


@dataclass
class DerivativeQuote:
    ticker: str
    asset_class: str
    asset_label: str
    description: str
    expiry_label: str
    maturity: str
    last_price: float | None = None
    open_price: float | None = None
    high_price: float | None = None
    low_price: float | None = None
    avg_price: float | None = None
    close_prev: float | None = None
    change: float | None = None
    change_pct: float | None = None
    bid: float | None = None
    ask: float | None = None
    volume: int | None = None
    num_trades: int | None = None
    open_interest: int | None = None
    notional: float | None = None
    limit_up: float | None = None
    limit_down: float | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "ticker": self.ticker,
            "asset_class": self.asset_class,
            "asset_label": self.asset_label,
            "description": self.description,
            "expiry_label": self.expiry_label,
            "maturity": self.maturity,
            "last_price": self.last_price,
            "open_price": self.open_price,
            "high_price": self.high_price,
            "low_price": self.low_price,
            "avg_price": self.avg_price,
            "close_prev": self.close_prev,
            "change": self.change,
            "change_pct": self.change_pct,
            "bid": self.bid,
            "ask": self.ask,
            "volume": self.volume,
            "num_trades": self.num_trades,
            "open_interest": self.open_interest,
            "notional": self.notional,
            "limit_up": self.limit_up,
            "limit_down": self.limit_down,
            "error": self.error,
        }


def parse_ticker(ticker: str) -> tuple[str, str, str]:
    """Extract asset class, label, and expiry from ticker.

    E.g. DI1F29 -> ('DI1', 'DI Futuro', 'Jan/29')
    """
    for i in range(len(ticker) - 3, 0, -1):
        ch = ticker[i]
        rest = ticker[i + 1:]
        if ch in MONTH_CODES and rest.isdigit():
            asset = ticker[:i]
            month = MONTH_CODES[ch]
            year = rest
            label = ASSET_LABELS.get(asset, asset)
            return asset, label, f"{month}/{year}"
    return ticker, ASSET_LABELS.get(ticker, ticker), ""


def _safe_float(data: dict, key: str) -> float | None:
    val = data.get(key)
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(data: dict, key: str) -> int | None:
    val = data.get(key)
    if val is None:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _parse_contract(entry: dict) -> DerivativeQuote:
    """Parse a single contract entry from B3's response."""
    symb = entry.get("symb", "")
    desc = entry.get("desc", "")
    asset_code, asset_label, expiry_label = parse_ticker(symb)

    qtn = entry.get("SctyQtn", {})
    asset_info = entry.get("asset", {})
    summary = asset_info.get("AsstSummry", {})
    buy = entry.get("buyOffer", {})
    sell = entry.get("sellOffer", {})

    last = _safe_float(qtn, "curPrc")
    opn = _safe_float(qtn, "opngPric")
    high = _safe_float(qtn, "maxPric")
    low = _safe_float(qtn, "minPric")
    avg = _safe_float(qtn, "avrgPric")
    prev = _safe_float(qtn, "prvsDayAdjstmntPric")
    limit_up = _safe_float(qtn, "topLmtPric")
    limit_down = _safe_float(qtn, "bottomLmtPric")

    bid = _safe_float(buy, "price")
    ask = _safe_float(sell, "price")

    vol = _safe_int(summary, "tradQty")
    num_trades = _safe_int(summary, "traddCtrctsQty")
    oi = _safe_int(summary, "opnCtrcts")
    notional = _safe_float(summary, "grssAmt")
    maturity = summary.get("mtrtyCode", "")

    change = None
    change_pct = None
    # Use best available price for change calc
    ref_price = last or bid or ask
    if ref_price is not None and prev is not None and prev != 0:
        change = round(ref_price - prev, 6)
        change_pct = round((change / prev) * 100, 3)

    return DerivativeQuote(
        ticker=symb,
        asset_class=asset_code,
        asset_label=asset_label,
        description=desc,
        expiry_label=expiry_label,
        maturity=maturity,
        last_price=last,
        open_price=opn,
        high_price=high,
        low_price=low,
        avg_price=avg,
        close_prev=prev,
        change=change,
        change_pct=change_pct,
        bid=bid,
        ask=ask,
        volume=vol,
        num_trades=num_trades,
        open_interest=oi,
        notional=notional,
        limit_up=limit_up,
        limit_down=limit_down,
    )


@dataclass
class B3Client:
    timeout: float = 30.0
    _http: httpx.AsyncClient = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._http = httpx.AsyncClient(
            base_url=B3_BASE_URL,
            timeout=self.timeout,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
            },
            verify=False,
        )

    async def close(self) -> None:
        await self._http.aclose()

    async def get_asset_class(self, asset: str) -> list[DerivativeQuote]:
        """Fetch all contracts for an asset class (e.g. DI1, DOL, IND)."""
        try:
            resp = await self._http.get(f"/DerivativeQuotation/{asset}")
            resp.raise_for_status()
            data = resp.json()

            if data.get("BizSts", {}).get("cd") != "OK":
                desc = data.get("BizSts", {}).get("desc", "Unknown error")
                logger.warning("B3 API NOK for %s: %s", asset, desc)
                return []

            contracts = data.get("Scty", [])
            return [_parse_contract(c) for c in contracts]

        except Exception as exc:
            logger.exception("Failed to fetch asset class %s", asset)
            return []

    async def get_all_quotes(
        self,
        asset_classes: list[str] | None = None,
        tickers_filter: list[str] | None = None,
        min_open_interest: int = 0,
    ) -> list[DerivativeQuote]:
        """Fetch quotes for multiple asset classes concurrently.

        Args:
            asset_classes: List of asset codes (default: ASSET_CLASSES).
            tickers_filter: If set, only return these specific tickers.
            min_open_interest: Filter out contracts with OI below this.
        """
        import asyncio

        classes = asset_classes or ASSET_CLASSES
        results = await asyncio.gather(*[self.get_asset_class(a) for a in classes])

        all_quotes: list[DerivativeQuote] = []
        for quotes in results:
            all_quotes.extend(quotes)

        # Apply filters
        if tickers_filter:
            ticker_set = {t.upper() for t in tickers_filter}
            all_quotes = [q for q in all_quotes if q.ticker in ticker_set]

        if min_open_interest > 0:
            all_quotes = [
                q for q in all_quotes
                if q.open_interest is not None and q.open_interest >= min_open_interest
            ]

        # Sort: by asset class, then by maturity
        all_quotes.sort(key=lambda q: (q.asset_class, q.maturity))

        return all_quotes
