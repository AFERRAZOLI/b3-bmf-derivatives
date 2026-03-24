import { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Header from './components/Header';
import QuotesTable from './components/QuotesTable';
import DIcurveChart from './components/DIcurveChart';
import PriceChart from './components/PriceChart';
import WatchlistConfig from './components/WatchlistConfig';

const FILTERS = [
  { code: 'all', label: 'Todos' },
  { code: 'DI1', label: 'DI' },
  { code: 'DOL', label: 'Dólar' },
  { code: 'WDO', label: 'Mini Dólar' },
  { code: 'IND', label: 'Ibovespa' },
  { code: 'WIN', label: 'Mini Ibov' },
];

function getWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws/quotes`;
}

export default function App() {
  const { data, connected } = useWebSocket(getWsUrl());
  const [allQuotes, setAllQuotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [showCharts, setShowCharts] = useState(true);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('b3_watchlist');
      return saved ? JSON.parse(saved) : null; // null = show all
    } catch { return null; }
  });

  // Update quotes from WebSocket
  useEffect(() => {
    if (data?.type === 'quotes' && data.data) {
      setAllQuotes(data.data);
      // Auto-select first DI1 ticker for price chart if none selected
      if (!selectedTicker) {
        const first = data.data.find(q => q.asset_class === 'DI1' && q.last_price);
        if (first) setSelectedTicker(first.ticker);
      }
    }
  }, [data]);

  // Fetch via REST on mount + poll as fallback when WS is not connected
  useEffect(() => {
    let timer;
    const fetchRest = () => {
      fetch('/api/quotes?min_oi=100')
        .then(r => r.json())
        .then(d => {
          if (d.quotes) setAllQuotes(d.quotes);
        })
        .catch(err => console.error('REST fetch error:', err));
    };

    // Always fetch on mount for immediate data
    fetchRest();

    // Poll every 15s as fallback when WS is down
    if (!connected) {
      timer = setInterval(fetchRest, 15000);
    }
    return () => clearInterval(timer);
  }, [connected]);

  // Apply watchlist filter
  const displayQuotes = useMemo(() => {
    if (!watchlist || watchlist.length === 0) return allQuotes;
    const set = new Set(watchlist);
    return allQuotes.filter(q => set.has(q.ticker));
  }, [allQuotes, watchlist]);

  const handleSaveWatchlist = (tickers, minOI) => {
    setWatchlist(tickers.length > 0 ? tickers : null);
  };

  return (
    <>
      <Header
        connected={connected}
        total={displayQuotes.length}
        onOpenWatchlist={() => setWatchlistOpen(true)}
        showCharts={showCharts}
        onToggleCharts={() => setShowCharts(v => !v)}
      />

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button
            key={f.code}
            className={`filter-tab ${filter === f.code ? 'active' : ''}`}
            onClick={() => setFilter(f.code)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={`main-layout ${showCharts ? 'with-charts' : ''}`}>
        {showCharts && (
          <div className="charts-panel">
            <DIcurveChart quotes={allQuotes} />
            <PriceChart ticker={selectedTicker} quotes={allQuotes} />
          </div>
        )}

        <QuotesTable
          quotes={displayQuotes}
          filter={filter}
          onSelectTicker={setSelectedTicker}
          selectedTicker={selectedTicker}
        />
      </div>

      <div className="footer">
        <span>Dados com ~15 min de atraso | Fonte: cotacao.b3.com.br | WebSocket push a cada 15s</span>
        <span>Horário BMF: 09:00 - 18:00 BRT</span>
      </div>

      <WatchlistConfig
        isOpen={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        allQuotes={allQuotes}
        watchlist={watchlist || []}
        onSave={handleSaveWatchlist}
      />
    </>
  );
}
