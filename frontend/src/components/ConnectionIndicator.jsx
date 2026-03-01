import React from 'react';
import { Wifi, WifiOff, RefreshCcw, Zap } from 'lucide-react';

function ConnectionIndicator({ status, source }) {
    if (status === 'connected') {
        if (source === 'premium_stream') {
            return (
                <div className="indicator premium-indicator" data-tooltip="Live streaming via WebSockets">
                    <Zap size={14} className="flash-icon" />
                    <span className="status-text">Live: Premium Stream</span>
                    <div className="pulsing-dot green"></div>
                </div>
            );
        } else {
            return (
                <div className="indicator standard-indicator" data-tooltip="Connected to Public API via WebSocket">
                    <Wifi size={14} />
                    <span className="status-text">Connected: Public API</span>
                    <div className="pulsing-dot blue"></div>
                </div>
            );
        }
    }

    if (status === 'connecting') {
        return (
            <div className="indicator standard-indicator">
                <RefreshCcw size={14} className="rotating" />
                <span className="status-text">Connecting...</span>
                <div className="pulsing-dot blue"></div>
            </div>
        );
    }

    return (
        <div className="indicator warning-indicator">
            <WifiOff size={14} />
            <span className="status-text">Disconnected</span>
            <div className="pulsing-dot red"></div>
        </div>
    );
}

export default ConnectionIndicator;
