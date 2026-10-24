/** Persistent frames/covers are shared by every screen. Catalog icons are
 * requested only when a page actually inserts them into the interface. */
export function initialMenuAssetIds(ids:Iterable<string>){return [...ids].filter(id=>id.startsWith('ui.')||id.startsWith('building.')||['unit.marine','unit.zergling','unit.zealot'].includes(id));}
