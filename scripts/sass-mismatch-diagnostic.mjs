/** Complete diagnostic CSS differences; never used for acceptance or goldens. */
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function mixinMismatchArchive(results, line, tarballSha) {
  if (!Array.isArray(results) || !['main','21.x'].includes(line) || !/^[0-9a-f]{64}$/.test(tarballSha || ''))
    throw new Error('Invalid Sass mismatch diagnostic subject');
  const failed = results.filter(row => row.result !== 'pass');
  if (failed.some(row => row.line !== line)) throw new Error('Wrong-line Sass mismatch diagnostic case');
  const ids = failed.map(row => row.case_id);
  if (ids.some(id => typeof id !== 'string' || !id.startsWith('mixin-argument/')) || new Set(ids).size !== ids.length)
    throw new Error('Invalid or duplicate Sass mismatch diagnostic cases');
  const cases = failed.map(row => ({case_id:row.case_id,mixin:row.mixin,variant:row.variant,
    argument:row.argument,call:row.call,line:row.line,identity:row.identity,
    expected:row.expected ?? null,actual:row.actual ?? null,error:row.error ?? null,result:row.result}));
  const raw = Buffer.from(JSON.stringify({schema_version:1,scope:'diagnostic-only',source_line:line,
    tarball_sha256:tarballSha,cases}), 'utf8');
  const gzip = gzipSync(raw);
  const encoded = gzip.toString('base64');
  const chunks = [];
  for (let offset=0;offset<encoded.length;offset+=3000) chunks.push(encoded.slice(offset,offset+3000));
  return {header:{schema_version:1,scope:'diagnostic-only',source_line:line,tarball_sha256:tarballSha,
    case_count:cases.length,raw_bytes:raw.length,raw_sha256:sha(raw),gzip_bytes:gzip.length,
    gzip_sha256:sha(gzip),chunk_count:chunks.length},chunks};
}
export function emitMixinMismatchArchive(results, line, tarballSha, emit=console.log) {
  const {header,chunks}=mixinMismatchArchive(results,line,tarballSha);
  emit('sass-mixin-difference-header '+JSON.stringify(header));
  chunks.forEach((data,index)=>emit('sass-mixin-difference-chunk '+JSON.stringify({index,total:chunks.length,data})));
  return header;
}
