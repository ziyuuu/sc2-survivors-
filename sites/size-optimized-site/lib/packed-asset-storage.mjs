const PREFIX = 'sc2-game-assets/v1/';
const UPLOAD_PREFIX = '/api/_delivery-assets/';
const json = (status, data) => Response.json(data, {status, headers: {'cache-control': 'no-store'}});
const hex = buffer => [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');

export async function packedAssetResponse(request, env, ctx, inventory, options = {}) {
  const pathname = new URL(request.url).pathname;
  const upload = pathname.startsWith(UPLOAD_PREFIX);
  if (!upload && !/^\/assets\/bundle-[a-z0-9-]+\.bin$/.test(pathname)) return null;
  const name = pathname.slice(upload ? UPLOAD_PREFIX.length : '/assets/'.length);
  const entry = Object.hasOwn(inventory, name) ? inventory[name] : null;
  if (upload) {
    if (!options.uploads || Date.now() >= options.uploadsExpireAt || !env.SC2_ASSET_DELIVERY_KEY || request.headers.get('authorization') !== 'Bearer ' + env.SC2_ASSET_DELIVERY_KEY) return json(403, {error: 'forbidden'});
    if (request.method !== 'PUT') return json(405, {error: 'method_not_allowed'});
  } else if (!['GET', 'HEAD'].includes(request.method)) return json(405, {error: 'method_not_allowed'});
  if (!entry) return json(404, {error: 'not_found'});
  if (!env.BUCKET) return json(503, {error: 'storage_unavailable'});
  const key = PREFIX + entry.sha256;
  if (upload) {
    if (entry.bytes > 8 * 1024 * 1024 || Number(request.headers.get('content-length')) !== entry.bytes || request.headers.get('x-content-sha256') !== entry.sha256) return json(400, {error: 'invalid_payload'});
    const reader = request.body?.getReader();
    if (!reader) return json(400, {error: 'invalid_payload'});
    const parts = []; let received = 0;
    for (;;) {
      const {done, value} = await reader.read(); if (done) break;
      received += value.byteLength;
      if (received > entry.bytes) { await reader.cancel(); return json(413, {error: 'invalid_payload'}); }
      parts.push(value);
    }
    if (received !== entry.bytes) return json(400, {error: 'invalid_payload'});
    const bytes = new Uint8Array(received); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== entry.sha256) return json(400, {error: 'integrity_mismatch'});
    const previous = await env.BUCKET.head(key);
    if (previous && (previous.size !== entry.bytes || previous.customMetadata?.sha256 !== entry.sha256)) return json(409, {error: 'object_conflict'});
    if (!previous) await env.BUCKET.put(key, bytes, {httpMetadata: {contentType: 'application/octet-stream'}, customMetadata: {sha256: entry.sha256}});
    return json(200, {sha256: entry.sha256, bytes: entry.bytes, present: true});
  }
  const object = request.method === 'HEAD' ? await env.BUCKET.head(key) : await env.BUCKET.get(key);
  if (!object) return json(404, {error: 'not_found'});
  if (object.size !== entry.bytes || object.customMetadata?.sha256 !== entry.sha256) return json(503, {error: 'integrity_mismatch'});
  const headers = {'content-type': 'application/octet-stream', 'content-length': String(entry.bytes), 'cache-control': 'public, max-age=31536000, immutable', etag: '"' + entry.sha256 + '"', 'x-content-type-options': 'nosniff'};
  if (request.headers.get('if-none-match') === headers.etag) return new Response(null, {status: 304, headers});
  const response = new Response(request.method === 'HEAD' ? null : object.body, {headers});
  return response;
}
