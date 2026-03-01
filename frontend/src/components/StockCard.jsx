import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function StockCard({ symbol, price }) {
    const [flashClass, setFlashClass] = useState('');
    const [trend, setTrend] = useState('flat'); // up, down, flat
    const prevPriceRef = useRef(price);

    useEffect(() => {
        if (price > prevPriceRef.current) {
            setFlashClass('flash-green');
            setTrend('up');
        } else if (price < prevPriceRef.current) {
            setFlashClass('flash-red');
            setTrend('down');
        }

        // Clear flash class after animation completes
        const timer = setTimeout(() => {
            setFlashClass('');
        }, 1000);

        prevPriceRef.current = price;

        return () => clearTimeout(timer);
    }, [price]);

    const formatSymbol = (sym) => sym.replace('.NS', '');

    return (
        <div className={`rate-card stock-card ${flashClass}`}>
            <div className="card-top">
                <div className="currency-info">
                    <div className="currency-titles">
                        <h4>{formatSymbol(symbol)}</h4>
                        <span className="currency-name">NSE</span>
                    </div>
                </div>
                <div className={`icon-wrapper trend-${trend}`}>
                    {trend === 'up' && <TrendingUp size={20} />}
                    {trend === 'down' && <TrendingDown size={20} />}
                    {trend === 'flat' && <Minus size={20} />}
                </div>
            </div>

            <div className="card-bottom">
                <div className="rate-display">
                    <span className="rate-label">Last Traded Price</span>
                    <div className="rate-value-container">
                        <span className={`rate-value value-${trend}`}>
                            ₹{price.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StockCard;
