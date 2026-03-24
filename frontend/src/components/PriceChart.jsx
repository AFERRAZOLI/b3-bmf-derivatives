import { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';

export default function PriceChart({ ticker, quotes }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const historyRef = useRef([]); // accumulate price history locally

  const quote = quotes.find(q => q.ticker === ticker);

  // Accumulate price history as new data arrives
  useEffect(() => {
    if (!quote) return;
    const price = quote.last_price ?? quote.bid;
    if (price == null) return;

    const now = Math.floor(Date.now() / 1000);
    const history = historyRef.current;

    // Only add if price changed or enough time passed (>5s)
    const last = history[history.length - 1];
    if (!last || last.value !== price || now - last.time > 5) {
      history.push({ time: now, value: price });
      // Keep last 1000 points
      if (history.length > 1000) {
        historyRef.current = history.slice(-1000);
      }
    }
  }, [quote]);

  // Reset history when ticker changes
  useEffect(() => {
    historyRef.current = [];
  }, [ticker]);

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#161630' },
        textColor: '#888',
        fontSize: 10,
        fontFamily: 'Consolas, monospace',
      },
      grid: {
        vertLines: { color: '#252545' },
        horzLines: { color: '#252545' },
      },
      rightPriceScale: { borderColor: '#252545' },
      timeScale: {
        borderColor: '#252545',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
    });

    const series = chart.addSeries(LineSeries, {
      color: '#ff9800',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      chart.resize(width, height);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [ticker]);

  // Update series data
  useEffect(() => {
    if (!seriesRef.current) return;
    const history = historyRef.current;
    if (history.length > 0) {
      seriesRef.current.setData(history);
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [quote]);

  return (
    <div className="chart-container">
      <h3>
        Preço Intraday &mdash;{' '}
        <span style={{ color: '#00bcd4' }}>{ticker || 'Selecione um contrato'}</span>
        {quote && (
          <span style={{ marginLeft: 12, color: quote.change >= 0 ? '#4caf50' : '#ef5350' }}>
            {quote.last_price?.toFixed(3)} ({quote.change >= 0 ? '+' : ''}{quote.change_pct?.toFixed(2)}%)
          </span>
        )}
      </h3>
      <div className="chart-wrapper" ref={containerRef} />
    </div>
  );
}
