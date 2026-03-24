import { useState, useEffect } from 'react';

const ASSET_CLASSES = [
  { code: 'DI1', label: 'DI Futuro' },
  { code: 'DOL', label: 'Dólar Futuro' },
  { code: 'WDO', label: 'Mini Dólar' },
  { code: 'IND', label: 'Ibovespa Futuro' },
  { code: 'WIN', label: 'Mini Ibovespa' },
];

export default function WatchlistConfig({ isOpen, onClose, allQuotes, watchlist, onSave }) {
  const [selected, setSelected] = useState(new Set(watchlist));
  const [minOI, setMinOI] = useState(
    () => parseInt(localStorage.getItem('b3_min_oi') || '1000')
  );

  useEffect(() => {
    setSelected(new Set(watchlist));
  }, [watchlist, isOpen]);

  if (!isOpen) return null;

  // Group available contracts by asset class
  const groups = {};
  for (const q of allQuotes) {
    const key = q.asset_class;
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  }

  const toggleTicker = (ticker) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const selectAllInClass = (assetCode) => {
    const tickers = (groups[assetCode] || []).map(q => q.ticker);
    setSelected(prev => {
      const next = new Set(prev);
      tickers.forEach(t => next.add(t));
      return next;
    });
  };

  const clearClass = (assetCode) => {
    const tickers = new Set((groups[assetCode] || []).map(q => q.ticker));
    setSelected(prev => {
      const next = new Set(prev);
      tickers.forEach(t => next.delete(t));
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem('b3_min_oi', String(minOI));
    localStorage.setItem('b3_watchlist', JSON.stringify([...selected]));
    onSave([...selected], minOI);
    onClose();
  };

  const handleSelectAll = () => {
    setSelected(new Set(allQuotes.map(q => q.ticker)));
  };

  const handleClearAll = () => {
    setSelected(new Set());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Configurar Watchlist</h2>

        <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="controls-label" style={{ color: 'var(--text-header)', fontSize: 11 }}>
            Min OI:
          </label>
          <input
            type="number"
            value={minOI}
            onChange={e => setMinOI(parseInt(e.target.value) || 0)}
            style={{
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', padding: '3px 6px',
              fontFamily: 'inherit', fontSize: 12, width: 80,
            }}
          />
          <button className="btn" onClick={handleSelectAll}>Selecionar Todos</button>
          <button className="btn" onClick={handleClearAll}>Limpar</button>
          <span style={{ color: 'var(--text-neutral)', fontSize: 11 }}>
            {selected.size} selecionados
          </span>
        </div>

        {ASSET_CLASSES.map(({ code, label }) => {
          const contracts = groups[code] || [];
          if (contracts.length === 0) return null;
          const selectedInClass = contracts.filter(q => selected.has(q.ticker)).length;

          return (
            <div className="modal-section" key={code}>
              <h3>
                {label} ({selectedInClass}/{contracts.length})
                <button
                  className="btn"
                  style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px' }}
                  onClick={() => selectAllInClass(code)}
                >todos</button>
                <button
                  className="btn"
                  style={{ marginLeft: 4, fontSize: 10, padding: '1px 6px' }}
                  onClick={() => clearClass(code)}
                >limpar</button>
              </h3>
              <div className="contract-grid">
                {contracts.map(q => (
                  <button
                    key={q.ticker}
                    className={`contract-chip ${selected.has(q.ticker) ? 'selected' : ''}`}
                    onClick={() => toggleTicker(q.ticker)}
                    title={`OI: ${q.open_interest?.toLocaleString('pt-BR') ?? '—'} | Maturity: ${q.maturity}`}
                  >
                    {q.ticker} <span style={{ color: 'var(--text-neutral)' }}>{q.expiry_label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn active" onClick={handleSave}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
