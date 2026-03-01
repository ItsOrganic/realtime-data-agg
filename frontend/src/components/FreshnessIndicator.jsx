import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Zap } from 'lucide-react';

function FreshnessIndicator({ source, ageSeconds }) {
    const [localAge, setLocalAge] = useState(ageSeconds);

    useEffect(() => {
        setLocalAge(ageSeconds);
        const interval = setInterval(() => {
            setLocalAge(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [ageSeconds]);

    const getTimeString = () => {
        if (localAge < 60) return `${localAge}s ago`;
        const mins = Math.floor(localAge / 60);
        return `${mins}m ${localAge % 60}s ago`;
    };

    if (source === 'premium') {
        return (
            <div className="indicator premium-indicator" data-tooltip="High-reliability live data">
                <Zap size={14} className="flash-icon" />
                <span className="status-text">Live: Premium API</span>
                <div className="pulsing-dot green"></div>
            </div>
        );
    }

    // Source is public (cached or fresh)
    const isStale = localAge > 300; // Over 5 mins
    return (
        <div className={`indicator ${isStale ? 'warning-indicator' : 'standard-indicator'}`}>
            {isStale ? <Clock size={14} /> : <ShieldCheck size={14} />}
            <span className="status-text">
                Updated: {getTimeString()}
            </span>
            <div className={`pulsing-dot ${isStale ? 'yellow' : 'blue'}`}></div>
        </div>
    );
}

export default FreshnessIndicator;
