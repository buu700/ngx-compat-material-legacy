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

/** Exact source-bound review records are required in addition to roster labels.
 * Binding validates evidence identity; complete semantic audit still reviews
 * the recorded conclusions and their independent API/behavior receipts.
 */
export function authoredUseReviewEvidence(candidate, line, readMember, sha256) {
  const rows=Array.isArray(candidate?.symbol_uses)?candidate.symbol_uses:[];
  const insufficient=[];
  let reviewed=0;
  for (const row of rows) {
    if (row.disposition !== 'closed' || row.status !== 'reviewed') continue;
    let valid=false;
    try {
      const ref=row.source_review;
      if (!ref || typeof ref.path !== 'string' || !ref.path.startsWith('compatibility/f10/authored-use-reviews/')
          || !/^[0-9a-f]{64}$/.test(ref.sha256 || '')) throw Error('missing review');
      const bytes=readMember(ref.path);
      if (!bytes || !bytes.length || sha256(bytes)!==ref.sha256) throw Error('changed review');
      const body=JSON.parse(bytes.toString('utf8'));
      if (body.schema_version!==1 || body.line!==line || body.status!=='reviewed'
          || !Array.isArray(body.reviews)) throw Error('wrong review scope');
      const matches=body.reviews.filter(r=>r.file===row.file && r.module===row.module && r.symbol===row.symbol);
      if (matches.length!==1) throw Error('missing or ambiguous use');
      const review=matches[0];
      if (!['stable-public-peer','owned-replacement','removed-use','test-only'].includes(review.conclusion)
          || typeof review.decision!=='string' || review.decision.trim().length<80
          || typeof review.reviewer!=='string' || !review.reviewer.trim()
          || !Array.isArray(review.independent_evidence) || !review.independent_evidence.length) throw Error('missing source judgment');
      const source=readMember('projects/ngx-material-legacy/'+row.file);
      if (!source || !source.length || !/^[0-9a-f]{64}$/.test(review.candidate_source_sha256 || '')
          || sha256(source)!==review.candidate_source_sha256) throw Error('stale source');
      if (review.conclusion==='test-only' && !/(?:^|\/)testing\/|\.spec\.ts$/.test(row.file)) throw Error('production use');
      for (const evidence of review.independent_evidence) {
        if (!evidence || typeof evidence.path!=='string' || (evidence.path===ref.path || evidence.path==='projects/ngx-material-legacy/'+row.file)
            || !/^[0-9a-f]{64}$/.test(evidence.sha256 || '')) throw Error('invalid evidence');
        const data=readMember(evidence.path);
        if (!data || !data.length || sha256(data)!==evidence.sha256) throw Error('missing or changed independent evidence');
      }
      valid=true;
    } catch { /* Unproved closed labels remain failed. */ }
    if (valid) reviewed++;
    else insufficient.push({file:row.file,module:row.module,symbol:row.symbol});
  }
  return {reviewed,insufficient:insufficient.length,insufficient_uses:insufficient};
}
