"""
Sunai Voice Assistant Backend
Entry point launching FastAPI and WebSocket server.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from Backend import config
from Backend.ws_server import SunaiConnectionManager
from Backend.audio_cache_manager import ensure_audio_cache

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sunai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure pre-recorded phrases are generated and cached
    logger.info("Initializing Sunai audio cache...")
    ensure_audio_cache()
    logger.info("Sunai Backend initialized.")
    yield
    logger.info("Sunai Backend shutdown.")


app = FastAPI(title="Sunai Voice Assistant", lifespan=lifespan)

# Allow Frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Sunai Voice Assistant",
        "prisma_model": config.PRISMA_MODEL,
        "timbre_model": config.TIMBRE_MODEL,
    }


@app.websocket(config.WS_PATH)
async def websocket_endpoint(websocket: WebSocket):
    manager = SunaiConnectionManager(websocket)
    await manager.start()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)

