import { useState, useRef, useEffect } from 'react';
import { fmt, fmtInt, fmtChange, fmtPct, chgClass, decimalsFor } from '../utils/format';

const COLUMNS = [
  { key: 'ticker', label: 'Ticker', left: true },
  { key: 'asset_label', label: 'Classe', left: true },
  { key: 'expiry_label', label: 'Vencto', left: true },
  { key: 'last_price', label: 'Último' },
  { key: 'change', label: 'Var' },
  { key: 'change_pct', label: 'Var %' },
  { key: 'bid', label: 'Bid' },
  { key: 'ask', label: 'Ask' },
  { key: 'open_price', label: 'Abertura' },
  { key: 'high_price', label: 'Máxima' },
  { key: 'low_price', label: 'Mínima' },
  { key: 'close_prev', label: 'Ajuste Ant' },
  { key: 'volume', label: 'Volume' },
  { key: 'open_interest', label: 'OI' },
];

export default function QuotesTable({ quotes, filter, onSelectTicker, selectedTicker }) {
  const [sort, setSort] = useState({ key: 'maturity', asc: true });
  const prevPrices = useRef({});
  const [flashMap, setFlashMap] = useState({});

  // Detect price changes for flash animation
  useEffect(() => {
    const newFlash = {};
    for (const q of quotes) {
      const prev = prevPrices.current[q.ticker];
      const cur = q.last_price ?? q.bid;
      if (prev != null && cur != null && prev !== cur) {
        newFlash[q.ticker] = cur > prev ? 'flash-up' : 'flash-down';
      }
      prevPrices.current[q.ticker] = cur;
    }
    if (Object.keys(newFlash).length > 0) {
      setFlashMap(newFlash);
      const timer = setTimeout(() => setFlashMap({}), 600);
      return () => clearTimeout(timer);
    }
  }, [quotes]);

  const filtered = filter === 'all'
    ? quotes
    : quotes.filter(q => q.asset_class === filter);

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sort.key];
    let vb = b[sort.key];
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string') {
      return sort.asc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sort.asc ? va - vb : vb - va;
  });

  // Group by asset class
  const groups = {};
  for (const q of sorted) {
    const key = q.asset_label;
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  }

  const toggleSort = (key) => {
    setSort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: true });
  };

  const renderValue = (q, col) => {
    const dec = decimalsFor(q.asset_class);
    switch (col.key) {
      case 'ticker': return <span className="ticker">{q.ticker}</span>;
      case 'asset_label': return <span className="asset-label">{q.asset_label}</span>;
      case 'expiry_label': return q.expiry_label;
      case 'last_price': return fmt(q.last_price, dec);
      case 'change': return <span className={chgClass(q.change)}>{fmtChange(q.change, dec)}</span>;
      case 'change_pct': return <span className={chgClass(q.change_pct)}>{fmtPct(q.change_pct)}</span>;
      case 'bid': return fmt(q.bid, dec);
      case 'ask': return fmt(q.ask, dec);
      case 'open_price': return fmt(q.open_price, dec);
      case 'high_price': return fmt(q.high_price, dec);
      case 'low_price': return fmt(q.low_price, dec);
      case 'close_prev': return fmt(q.close_prev, dec);
      case 'volume': return fmtInt(q.volume);
      case 'open_interest': return fmtInt(q.open_interest);
      default: return '—';
    }
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={col.left ? 'left' : ''}
                onClick={() => toggleSort(col.key)}
              >
                {col.label}
                {sort.key === col.key && (
                  <span className="sort-arrow">{sort.asc ? ' ▲' : ' ▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groups).map(([group, items]) => (
            <GroupRows
              key={group}
              group={group}
              items={items}
              flashMap={flashMap}
              renderValue={renderValue}
              onSelectTicker={onSelectTicker}
              selectedTicker={selectedTicker}
              showGroupHeader={filter === 'all'}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ group, items, flashMap, renderValue, onSelectTicker, selectedTicker, showGroupHeader }) {
  return (
    <>
      {showGroupHeader && (
        <tr className="group-header">
          <td colSpan={COLUMNS.length}>{group} ({items.length})</td>
        </tr>
      )}
      {items.map(q => (
        <tr
          key={q.ticker}
          className={flashMap[q.ticker] || ''}
          onClick={() => onSelectTicker(q.ticker)}
          style={{
            cursor: 'pointer',
            background: selectedTicker === q.ticker ? 'var(--bg-row-hover)' : undefined,
          }}
        >
          {COLUMNS.map(col => (
            <td key={col.key} className={col.left ? 'left' : ''}>
              {renderValue(q, col)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
