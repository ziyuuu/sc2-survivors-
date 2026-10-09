import source from './materials-source.json';
import stamp from './source-stamp.json';
export {source,stamp};
/** Replaced by an exact, local data-URL table in the standalone build. */
export function sampleTextureUrl(path:string){return new URL(path,import.meta.url).href;}
