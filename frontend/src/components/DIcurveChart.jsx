import { useEffect, useRef } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';

export default function DIcurveChart({ quotes }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const prevSeriesRef = useRef(null);

  // Filter DI1 quotes and build curve data
  const diQuotes = quotes
    .filter(q => q.asset_class === 'DI1' && q.maturity && (q.last_price || q.bid))
    .sort((a, b) => a.maturity.localeCompare(b.maturity));

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
      rightPriceScale: {
        borderColor: '#252545',
      },
      timeScale: {
        borderColor: '#252545',
        timeVisible: false,
        tickMarkFormatter: (time) => {
          // time is unix timestamp; we encode maturity index
          return '';
        },
      },
      crosshair: {
        mode: 0,
      },
    });

    // Current curve
    const series = chart.addSeries(LineSeries, {
      color: '#00bcd4',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
    });

    // Previous day curve
    const prevSeries = chart.addSeries(LineSeries, {
      color: '#555',
      lineWidth: 1,
      lineStyle: 2, // dashed
      priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    prevSeriesRef.current = prevSeries;

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = containerRef.current.getBoundingClientRect();
      chart.resize(width, height);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update data
  useEffect(() => {
    if (!seriesRef.current || diQuotes.length === 0) return;

    // Use maturity date as "time" — lightweight-charts needs { time, value }
    // We convert YYYY-MM-DD to the format lightweight-charts expects
    const curveData = diQuotes.map(q => ({
      time: q.maturity, // YYYY-MM-DD string works with lightweight-charts
      value: q.last_price ?? q.bid,
    }));

    const prevData = diQuotes
      .filter(q => q.close_prev != null)
      .map(q => ({
        time: q.maturity,
        value: q.close_prev,
      }));

    seriesRef.current.setData(curveData);
    if (prevData.length > 0) {
      prevSeriesRef.current.setData(prevData);
    }

    chartRef.current?.timeScale().fitContent();
  }, [diQuotes]);

  return (
    <div className="chart-container">
      <h3>Curva DI &mdash; Estrutura a Termo</h3>
      <div className="chart-wrapper" ref={containerRef} />
    </div>
  );
}
