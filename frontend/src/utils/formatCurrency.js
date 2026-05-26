export function formatCompactINR(amount) {
  const n = Math.round(Number(amount) || 0);
  if (n >= 100000) {
    const lakhs = n / 100000;
    return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(2)}L`.replace(/\.00L$/, 'L');
  }
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatINR(amount) {
  return `₹${Math.round(Number(amount) || 0).toLocaleString('en-IN')}`;
}
