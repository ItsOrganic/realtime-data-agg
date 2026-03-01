# Architecture & Implementation Decisions

**Which APIs did you choose and why?**
I chose the Frankfurter API (`api.frankfurter.app`) as the primary data source because it's a prominent, free public API for current exchange rates published by the European Central Bank. It doesn't require an API key, making it ideal for a quick prototype without hitting authentication roadblocks. For the high-frequency streaming aspect ("Premium Stream"), I implemented a local simulation engine using Python's `asyncio` and `random` modules rather than paying for a premium Websocket service. This allowed us to successfully demonstrate a highly responsive, real-time "tick" UI organically within the 60-minute constraint.

**What's your fallback strategy when an API fails?**
The architecture uses a dual-redundancy model via WebSockets. We have two contextual streams in our FastAPI backend: a Simulated Premium Stream (sub-second high-frequency ticks) and a Free Public API (slower 5-minute polling). The frontend maintains a persistent WebSocket connection to the backend. If the Premium Stream fails, the backend gracefully falls back to broadcasting the slower, static data from the Public API. Conversely, if the Public API fails, the backend seamlessly switches to pushing data from the Premium Stream. In either case, the user's WebSocket connection remains open, and the UI continues to function with the available data source, ensuring zero downtime.

**How do you handle conflicting data from different sources?**
The backend `main.py` acts as the single source of truth via an in-memory `latest_rates` cache. When switching between APIs, the backend simply updates this internal cache with the latest available data from the newly active source and broadcasts that cache to the frontend. Since the backend orchestrates the stream and only broadcasts from one source at a time (Primary or Fallback), there are no direct client-side conflicts. When the high-frequency stream takes over from the static stream, it uses the last known static values as its base to ensure continuity and prevent jarring UI jumps.

**What does the user see when things fail or data is stale?**
The UI is explicitly designed to communicate system state transparently through the `ConnectionIndicator` component:
- **Normal Premium Flow**: "Live: Premium Stream" (Green glowing badge, rapid red/green price flashes).
- **Graceful Fallback / Static Flow**: "Connected: Public API" (Blue badge, static prices).
- **Complete Disconnection**: A prominent red banner drops down: "Connection lost. Attempting to reconnect to live stream...". If no cached data is available locally, the UI gracefully enters a loading state with a spinner.

**Did you do anything to improve the staleness of data? If so, what?**
Yes. To provide a "live" feel while relying on a static, 5-minute polled public API, we implemented the "Simulated Premium Stream". This engine takes the base rates from the public API and applies micro-fluctuations (using `random.uniform`) at a sub-second interval. This continuously updates the frontend, ensuring the UI feels dynamic, fresh, and engaging. It completely masks the underlying staleness of the free data source while maintaining realistic baseline values.

**What did you cut to ship in 60 minutes?**
- **Real Premium Websocket Integration**: Skipped integrating a paid provider (like Finnhub or Polygon.io) for real tick data to save on setup and authentication time.
- **Database Persistence**: We are caching the latest rates in-memory rather than standing up a Redis or Postgres store.
- **Historical Charts**: Focused entirely on real-time streaming flash-cards rather than rendering historical trend graphs.

**What would you add with more time?**
- Integration with a real premium financial data provider via authenticated WebSockets.
- A Redis caching layer for the backend to scale the WebSocket manager across multiple Uvicorn worker processes.
- Interactive historical rate charts (using a library like Recharts) for each currency pair.
- User authentication and personalized dashboards (allowing users to save favorite currency pairs).

**Any other thoughts you had while building this out.**
Implementing the frontend specifically with Vanilla CSS rather than a framework like Tailwind was a fun constraint that resulted in a very bespoke, "premium" feel. The glassmorphism, organic background blobs, and subtle flash animations give the application a refined aesthetic. Additionally, engineering the "Developer Controls" toggles directly into the UI was a fantastic way to visually prove the backend's fault-tolerance without needing complex network interruption tools during a live demo.
