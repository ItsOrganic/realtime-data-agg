import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Euro, PoundSterling, JapaneseYen } from 'lucide-react';

const getCurrencyIcon = (currency) => {
    switch (currency) {
        case 'EUR': return <Euro size={20} />;
        case 'GBP': return <PoundSterling size={20} />;
        case 'JPY': return <JapaneseYen size={20} />;
        default: return <DollarSign size={20} />;
    }
};

const getCurrencyName = (currency) => {
    const names = {
        'EUR': 'Euro',
        'GBP': 'British Pound',
        'JPY': 'Japanese Yen',
        'AUD': 'Australian Dollar',
        'CAD': 'Canadian Dollar',
        'CHF': 'Swiss Franc',
        'INR': 'Indian Rupee',
        'CNY': 'Chinese Yuan',
        'NZD': 'New Zealand Dollar',
        'SGD': 'Singapore Dollar'
    };
    return names[currency] || currency;
};

const getFlagEmoji = (currency) => {
    const flags = {
        'EUR': '🇪🇺',
        'GBP': '🇬🇧',
        'JPY': '🇯🇵',
        'AUD': '🇦🇺',
        'CAD': '🇨🇦',
        'CHF': '🇨🇭',
        'INR': '🇮🇳',
        'CNY': '🇨🇳',
        'NZD': '🇳🇿',
        'SGD': '🇸🇬'
    };
    return flags[currency] || '🌍';
};

function RateCard({ currency, rate }) {
    const [flashClass, setFlashClass] = useState('');
    const [trend, setTrend] = useState('flat'); // up, down, flat
    const prevRateRef = useRef(rate);

    useEffect(() => {
        // Determine number of decimals to use for comparison and display
        const decimals = (currency === 'JPY' || currency === 'INR') ? 2 : 4;
        const currentRateFixed = parseFloat(rate.toFixed(decimals));
        const previousRateFixed = parseFloat(prevRateRef.current.toFixed(decimals));

        if (currentRateFixed > previousRateFixed) {
            setFlashClass('flash-green');
            setTrend('up');
        } else if (currentRateFixed < previousRateFixed) {
            setFlashClass('flash-red');
            setTrend('down');
        }

        // Clear flash class after animation completes
        const timer = setTimeout(() => {
            setFlashClass('');
        }, 1000);

        prevRateRef.current = rate;

        return () => clearTimeout(timer);
    }, [rate, currency]);

    const decimals = (currency === 'JPY' || currency === 'INR') ? 2 : 4;

    return (
        <div className={`rate-card stock-card ${flashClass}`}>
            <div className="card-top">
                <div className="currency-info">
                    <span className="flag-emoji">{getFlagEmoji(currency)}</span>
                    <div className="currency-titles">
                        <h4>{currency}</h4>
                        <span className="currency-name">{getCurrencyName(currency)}</span>
                    </div>
                </div>
                <div className={`icon-wrapper trend-${trend}`}>
                    {getCurrencyIcon(currency)}
                </div>
            </div>

            <div className="card-bottom">
                <div className="rate-display">
                    <span className="rate-label">Current Rate</span>
                    <div className="rate-value-container">
                        <span className={`rate-value value-${trend}`}>
                            {rate.toFixed(decimals)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RateCard;
