/** Small interface symbols; unit portraits and combat art keep their original assets. */
const paths={
 scan:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v8l6 4"/>',
 army:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
 map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z M9 3v15 M15 6v15"/>',
 units:'<circle cx="8" cy="7" r="3"/><path d="M2 20v-4a6 6 0 0 1 12 0v4 M17 4a3 3 0 0 1 0 6 M17 13a5 5 0 0 1 5 5v2"/>',
 strike:'<path d="m12 2 3 6-3 3-3-3Z M12 11v11 M5 14l7-3 7 3 M4 20h16"/>',
 tactical:'<path d="m13 2-8 11h6l-1 9 9-13h-6Z"/>',
 loot:'<path d="M3 9h18v12H3Z M2 5h20v4H2Z M12 5v16 M12 5C6-2 2 5 12 5c10 0 6-7 0 0"/>',
 fallen:'<path d="m5 5 14 14 M19 5 5 19"/>',
 hive:'<path d="m12 3 7 5v9l-7 4-7-4V8Z M5 10l7 4 7-4 M12 14v7 M2 6l3 2 M22 6l-3 2 M2 19l3-2 M22 19l-3-2"/>',
 survive:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',
};
export function hudGlyph(kind:keyof typeof paths){return `<svg class="hud-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;}
