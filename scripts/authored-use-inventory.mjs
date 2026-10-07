/** Structural equality with the frozen authored-use roster; not semantic proof. */
export function authoredUseInventory(expected, candidate) {
  const key = row => row && ['file','module','symbol'].every(field => typeof row[field] === 'string' && row[field].length)
    ? JSON.stringify([row.file,row.module,row.symbol]) : null;
  const wanted = new Set(expected.map(key));
  const seen = new Set();
  let duplicates = 0, outside = 0, invalid = 0, open = 0;
  const rows = Array.isArray(candidate?.symbol_uses) ? candidate.symbol_uses : [];
  for (const row of rows) {
    const id = key(row);
    if (!id) { invalid++; continue; }
    if (seen.has(id)) duplicates++;
    seen.add(id);
    if (!wanted.has(id)) outside++;
    if (row.disposition !== 'closed' || row.status !== 'reviewed') open++;
  }
  const missing = [...wanted].filter(id => !seen.has(id)).length;
  const complete = wanted.size === expected.length && !wanted.has(null)
    && Array.isArray(candidate?.symbol_uses) && rows.length === expected.length
    && missing === 0 && duplicates === 0 && outside === 0 && invalid === 0;
  return {complete, expected: expected.length, observed: rows.length, missing, duplicates, outside, invalid, open};
}
