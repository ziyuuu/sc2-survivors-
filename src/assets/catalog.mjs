/** Asset provenance is not inferred from a filename. No fonts or game archives are fetched. */
export const PROVIDER = 'https://dist.sc2arcade.com/star-assets/';
export const INDEX_ROOT = 'https://raw.githubusercontent.com/sc2-arcade-watcher/asset-explorer/main/site/list/';
export const normalizeName = value => String(value).normalize('NFKC').toLowerCase().replace(/\.(png|dds|jpg|jpeg|glb)$/,'');
export function assetUrl(path, base = PROVIDER) {
  if (typeof path !== 'string' || !path || /[\\?#\x00-\x1f]/.test(path)) throw new Error('Invalid asset path');
  let parts;
  try { parts = path.split('/').map(decodeURIComponent); } catch { throw new Error('Invalid path encoding'); }
  if (parts.some(p => !p || p === '.' || p === '..' || /[/\\?#:%\x00-\x1f]/.test(p))) throw new Error('Unsafe asset path');
  if (!/\.(png|jpe?g|dds|glb)$/i.test(parts.at(-1))) throw new Error('Unsupported resource type');
  const origin = new URL(base); if (origin.protocol !== 'https:') throw new Error('HTTPS required');
  return new URL(parts.map(encodeURIComponent).join('/'), origin).href;
}
export function selectAsset(catalog, request) {
  if (!catalog || !Array.isArray(catalog.items)) throw new Error('Catalog requires items[]');
  const names = new Set((request.names ?? []).map(normalizeName));
  const matches = catalog.items.filter(x => x && typeof x.name === 'string' && names.has(normalizeName(x.name)));
  if (matches.length !== 1) return {id:request.id,status:matches.length ? 'ambiguous' : 'missing',candidates:matches.map(x=>x.name)};
  const item=matches[0];
  return {id:request.id,status:'indexed',name:item.name,sourceUrl:assetUrl(item.download),previewUrl:assetUrl(item.image),runtimeApproved:false,originalIdentityVerified:false};
}
export function assertManifest(manifest) {
  if (manifest.schemaVersion !== 2 || !Array.isArray(manifest.assets)) throw new Error('Unsupported manifest');
  const ids=new Set();
  for (const a of manifest.assets) {
    if (!/^[a-z0-9][a-z0-9._-]+$/.test(a.id) || ids.has(a.id)) throw new Error('Invalid or duplicate asset id');
    if (!['model','icon','ui','terrain-reference','brand'].includes(a.kind)) throw new Error('Unsupported asset kind');
    if (!Array.isArray(a.names) || !a.names.length) throw new Error('Explicit candidate names required');
    ids.add(a.id);
  }
  return manifest;
}
export class AssetCatalog {
  constructor(fetcher=globalThis.fetch) { this.fetcher=fetcher; this.pending=new Map(); }
  async catalog(category) {
    if (!/^[a-z-]+$/.test(category)) throw new Error('Invalid category');
    if (!this.pending.has(category)) this.pending.set(category,(async()=>{
      const response=await this.fetcher(INDEX_ROOT+category+'.json',{signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
      return response.json();
    })().catch(e=>{this.pending.delete(category);throw e;}));
    return this.pending.get(category);
  }
  async resolve(request) { return selectAsset(await this.catalog(request.category),request); }
}
