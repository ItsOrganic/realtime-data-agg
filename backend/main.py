import asyncio
import time
import random
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base currency and targets (10 currencies including INR)
BASE_CURRENCY = "USD"
TARGET_CURRENCIES = ["INR", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "NZD", "SGD"]
PUBLIC_API_URL = f"https://api.frankfurter.app/latest?from={BASE_CURRENCY}&to={','.join(TARGET_CURRENCIES)}"

# Cache to hold the last known good rates
latest_rates = {curr: 0.0 for curr in TARGET_CURRENCIES}
use_premium = True
simulate_failure = False

class AppState(BaseModel):
    use_premium: bool
    simulate_failure: bool

@app.post("/api/state")
async def update_state(state: AppState):
    global use_premium, simulate_failure
    use_premium = state.use_premium
    simulate_failure = state.simulate_failure
    logger.info(f"State updated: premium={use_premium}, fail={simulate_failure}")
    return {"status": "success"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")

manager = ConnectionManager()

async def fetch_base_rates():
    rates = {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(PUBLIC_API_URL)
            response.raise_for_status()
            data = response.json()
            if "rates" in data:
                rates = data["rates"]
    except Exception as e:
        logger.error(f"Error fetching from Frankfurter API: {e}")
    return rates

def get_simulated_premium_tick(base_rates):
    """
    Simulates a premium, ultra-fast streaming API that provides sub-second tick data.
    """
    fallback_bases = {
        "INR": 83.15,
        "EUR": 0.92,
        "GBP": 0.79,
        "JPY": 150.50,
        "AUD": 1.53,
        "CAD": 1.35,
        "CHF": 0.88,
        "CNY": 7.20,
        "NZD": 1.62,
        "SGD": 1.34
    }
    
    current_base = base_rates if set(base_rates.values()) != {0.0} else fallback_bases
    
    tick_rates = {}
    for curr, rate in current_base.items():
        if rate == 0.0:
            rate = fallback_bases.get(curr, 1.0)
        # Simulate a tiny random tick movement up or down
        fluctuation = rate * random.uniform(-0.0002, 0.0002)
        # JPY gets 2 decimal places usually, others mostly 4
        decimal_places = 2 if curr in ["JPY", "INR"] else 4
        tick_rates[curr] = round(rate + fluctuation, decimal_places)
        
    return tick_rates


async def rate_streaming_task():
    logger.info("Starting background rate streaming task...")
    
    global latest_rates
    global use_premium, simulate_failure
    
    # Initialize with real base rates if possible
    initial_rates = await fetch_base_rates()
    for curr, r in initial_rates.items():
        latest_rates[curr] = r
        
    # Variables for background polling of the actual API safely
    last_fetch_time = time.time()
    FETCH_INTERVAL = 300 # Fetch real base rates every 5 mins to not hammer the public API
        
    while True:
        try:
            current_time = time.time()
            if not manager.active_connections:
                await asyncio.sleep(1)
                continue

            # If simulate_failure is True, we fallback to the OTHER API gracefully
            active_is_premium = use_premium
            if simulate_failure:
                active_is_premium = not use_premium

            if not active_is_premium:
                # Failure Mode / Normal Mode: Fallback to slow Free Public API (Static Data Streams slowly)
                if current_time - last_fetch_time > FETCH_INTERVAL:
                    new_base = await fetch_base_rates()
                    if new_base:
                        for curr, r in new_base.items():
                            latest_rates[curr] = r
                    last_fetch_time = current_time

                message = {
                    "type": "tick",
                    "timestamp": current_time,
                    "source": "public_api",
                    "is_fallback": simulate_failure,
                    "rates": latest_rates
                }
                
                await manager.broadcast(message)
                await asyncio.sleep(3)
            
            else:
                # Normal Mode / Fallback Mode: High-freq fast streaming 
                tick_rates = get_simulated_premium_tick(latest_rates)
                
                for curr, r in tick_rates.items():
                    latest_rates[curr] = r
                    
                message = {
                    "type": "tick",
                    "timestamp": current_time,
                    "source": "premium_stream",
                    "is_fallback": simulate_failure,
                    "rates": tick_rates
                }
                
                await manager.broadcast(message)
                await asyncio.sleep(0.8)
            
        except Exception as e:
            logger.error(f"Error in streaming task: {e}")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    # Start the background task when the server starts
    asyncio.create_task(rate_streaming_task())

@app.websocket("/ws/rates/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    logger.info("New client connected to rate stream.")
    
    try:
        # Send initial state immediately
        await websocket.send_json({
            "type": "init",
            "timestamp": time.time(),
            "source": "premium_stream" if use_premium else "public_api",
            "is_fallback": False,
            "rates": latest_rates
        })
        
        # Keep connection open
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from rate stream.")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
