export function fmt(val, dec = 3) {
  if (val == null) return '—';
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function fmtInt(val) {
  if (val == null) return '—';
  return val.toLocaleString('pt-BR');
}

export function fmtPct(val) {
  if (val == null) return '—';
  const sign = val > 0 ? '+' : '';
  return sign + val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
}

export function fmtChange(val, dec = 3) {
  if (val == null) return '—';
  const sign = val > 0 ? '+' : '';
  return sign + val.toLocaleString('pt-BR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function chgClass(val) {
  if (val == null) return 'neutral';
  return val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral';
}

export function decimalsFor(assetClass) {
  if (assetClass === 'IND' || assetClass === 'WIN') return 0;
  return 3;
}
