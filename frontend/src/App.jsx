import React, { useState, useEffect, useRef } from 'react';
import RateCard from './components/RateCard';
import ConnectionIndicator from './components/ConnectionIndicator';
import { Activity, Zap, TrendingUp } from 'lucide-react';
import './index.css';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const HTTP_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
    const [data, setData] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, error
    const [usePremium, setUsePremium] = useState(true);
    const [forceFail, setForceFail] = useState(false);
    const ws = useRef(null);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const connectWebSocket = () => {
        setConnectionStatus('connecting');
        ws.current = new WebSocket(`${WS_URL}/ws/rates/stream`);

        ws.current.onopen = () => {
            setConnectionStatus('connected');
            console.log('WebSocket connected');
        };

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'init' || message.type === 'tick') {
                    setData(message);
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket Error:', error);
            setConnectionStatus('error');
        };

        ws.current.onclose = () => {
            console.log('WebSocket connection closed. Retrying in 5s...');
            setConnectionStatus('error');
            setTimeout(connectWebSocket, 5000);
        };
    };

    const updateServerState = async (premium, fail) => {
        try {
            await fetch(`${HTTP_URL}/api/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ use_premium: premium, simulate_failure: fail })
            });
        } catch (err) {
            console.error('Failed to set state on server:', err);
        }
    };

    const handlePremiumToggle = (e) => {
        const isChecked = e.target.checked;
        setUsePremium(isChecked);
        updateServerState(isChecked, forceFail);
    };

    const handleForceFailToggle = (e) => {
        const isChecked = e.target.checked;
        setForceFail(isChecked);
        updateServerState(usePremium, isChecked);
    };

    return (
        <div className="app-container">
            <div className="glass-background"></div>
            <div className="blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <main className="main-content">
                <header className="header">
                    <div className="logo">
                        <TrendingUp size={28} className="logo-icon" />
                        <h1>EquiRate Stream</h1>
                    </div>

                    <div className="header-actions">
                        <ConnectionIndicator status={connectionStatus} source={data?.source} />
                    </div>
                </header>

                <section className="dashboard">
                    <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            {/* <h2>Live Forex Feed</h2> */}
                            <p className="subtitle">Reference currency: USD</p>
                        </div>
                        <div style={{ textAlign: 'right', maxWidth: '400px' }}>
                            <div className="toggle-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.8rem' }}>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={usePremium}
                                        onChange={handlePremiumToggle}
                                    />
                                    <span className="slider round"></span>
                                    <span className="label-text" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>1. Use Premium API Stream</span>
                                </label>
                            </div>
                            <div className="toggle-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={forceFail}
                                        onChange={handleForceFailToggle}
                                    />
                                    <span className="slider round" style={{ borderColor: 'rgba(239, 68, 68, 0.5)' }}></span>
                                    <span className="label-text" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>2. Simulate API Failure</span>
                                </label>
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.3, marginTop: '0.5rem' }}>
                                <b>Graceful failures:</b> Service doesn't crash. If the active API fails, it falls back seamlessly to the highly-available backup.
                            </p>
                        </div>
                    </div>

                    {connectionStatus === 'error' && (
                        <div className="error-banner">
                            <Zap size={20} />
                            <p>Connection lost. Attempting to reconnect to live stream...</p>
                        </div>
                    )}

                    {(!data || connectionStatus === 'connecting') && data === null ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Establishing secure WebSocket connection...</p>
                        </div>
                    ) : (
                        <div className="rates-grid">
                            {data && Object.entries(data.rates).map(([currency, rate]) => (
                                <RateCard
                                    key={currency}
                                    currency={currency}
                                    rate={rate}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default App;
