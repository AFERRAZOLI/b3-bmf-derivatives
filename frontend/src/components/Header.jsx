import { useState, useEffect } from 'react';

export default function Header({ connected, total, onOpenWatchlist, showCharts, onToggleCharts }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="header">
      <h1>B3 &raquo; BMF DERIVATIVES</h1>
      <div className="header-right">
        <button className={`btn ${showCharts ? 'active' : ''}`} onClick={onToggleCharts}>
          {showCharts ? 'Ocultar Charts' : 'Mostrar Charts'}
        </button>
        <button className="btn" onClick={onOpenWatchlist}>Watchlist</button>
        <span>
          <span className={`status-dot ${connected ? 'connected' : ''}`} />
          {connected ? 'Live' : 'Desconectado'}
        </span>
        <span>{total != null ? `${total} contratos` : '—'}</span>
        <span>{time.toLocaleTimeString('pt-BR')}</span>
      </div>
    </div>
  );
}
