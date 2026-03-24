"""FastAPI application with REST + WebSocket endpoints."""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .b3_client import ASSET_CLASSES
from .broadcaster import QuoteBroadcaster
from .providers import B3PublicProvider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

provider: B3PublicProvider | None = None
broadcaster: QuoteBroadcaster | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global provider, broadcaster
    provider = B3PublicProvider()
    await provider.start()

    poll_interval = float(os.environ.get("POLL_INTERVAL", "15"))
    broadcaster = QuoteBroadcaster(provider, poll_interval=poll_interval)
    broadcaster.start()

    logger.info("App started")
    yield

    await broadcaster.stop()
    await provider.stop()
    logger.info("App stopped")


app = FastAPI(title="B3 BMF Derivatives Monitor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/quotes")
async def get_quotes(
    assets: str = Query(default=None),
    tickers: str = Query(default=None),
    min_oi: int = Query(default=0),
):
    asset_list = (
        [a.strip().upper() for a in assets.split(",") if a.strip()]
        if assets else None
    )
    ticker_list = (
        [t.strip().upper() for t in tickers.split(",") if t.strip()]
        if tickers else None
    )

    quotes = await provider.get_all_quotes(
        asset_classes=asset_list,
        tickers_filter=ticker_list,
        min_open_interest=min_oi,
    )
    return {"quotes": [q.to_dict() for q in quotes], "total": len(quotes)}


@app.get("/api/asset-classes")
async def get_asset_classes():
    return {"asset_classes": ASSET_CLASSES}


@app.get("/api/price-history/{ticker}")
async def get_price_history(ticker: str):
    history = broadcaster.price_history.get(ticker.upper(), [])
    return {"ticker": ticker.upper(), "history": history}


@app.websocket("/ws/quotes")
async def websocket_quotes(ws: WebSocket):
    await ws.accept()
    broadcaster.add_client(ws)

    # Send current data immediately
    if broadcaster.latest_quotes:
        await ws.send_text(json.dumps({
            "type": "quotes",
            "data": broadcaster.latest_quotes,
            "total": len(broadcaster.latest_quotes),
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }))

    try:
        while True:
            data = await ws.receive_text()
            logger.debug("WS received: %s", data)
    except WebSocketDisconnect:
        pass
    finally:
        broadcaster.remove_client(ws)
