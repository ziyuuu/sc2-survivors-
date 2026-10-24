import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const source='preview/starship-ui-20261015-r12',out='src/ui/starship';
const wanted=/\.(?:flagship|ship-column|ship-stage|ship-heading|ship-diagram|ship-art|ship-slots|stage-selected|equipment-inspector|inspector|inspect-|inventory-panel|inventory-toolbar|inventory-meta|panel-head|item-grid|item-picture|item-name|item-badge|equipment-icon|quality-pips|filter-sheet|filter-grid|multi-filter|filter-options|filter-choice|filter-actions|active-filters|filter-token|search-wrap|sort-control|game-button|game-brand-logo|brand|topbar|view-title|native-home|home-page|home-copy|home-brand|home-cover|cover-|main-actions|main-action|masthead|wordmark|title-rule|game-footer|stat-four|stats-panel|set-strip|preset-bar|nav|wallet|race-tabs|utilities|ambient)|^(?:body|:root|h[123])/;
function blocks(css){const result=[];let offset=0;while(offset<css.length){const open=css.indexOf('{',offset);if(open<0)break;let end=open+1,depth=1;while(end<css.length&&depth){if(css[end]==='{')depth++;else if(css[end]==='}')depth--;end++;}result.push([css.slice(offset,open).trim(),css.slice(open+1,end-1)]);offset=end;}return result;}
function adapt(css){return blocks(css).map(([selector,body])=>{
 if(selector.startsWith('@media')||selector.startsWith('@supports')){const inner=adapt(body);return inner?selector+'{'+inner+'}':'';}
 if(selector.startsWith('@'))return '';
 const selectors=selector.split(',').map(s=>s.trim()).filter(s=>wanted.test(s)).map(s=>{
  s=s.replaceAll('.ship-art','.legacy-ship-image').replaceAll('.shell','.ship-shell').replaceAll('[data-page=flagship]','[data-page=loadout]');
  if(/^(body|:root)/.test(s))return s.replace(/^(body|:root)/,'.starship-ui');return '.starship-ui '+s;
 });
 return selectors.length?selectors.join(',')+'{'+body+'}':'';
}).filter(Boolean).join('\n');}
const files=['style.css','revision.css','current-game.css','unified.css','loadout.css','refinements.css'],records=[];
let combined='/* Mechanically scoped R12 UI rules. Source and hashes: reports/local/starship-ui-polish-20261016-r19/reuse.json. */\n';
for(const name of files){const file=source+'/'+name,bytes=await fs.readFile(file);records.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});combined+='\n/* '+file+' */\n'+adapt(bytes.toString().replace(/\/\*[\s\S]*?\*\//g,''))+'\n';}
// Assets are supplied by the production host; old relative URLs must not break CSS imports.
combined=combined.replace(/url\(['"]?assets\/[^)'"\s]+['"]?\)/g,'none');
// Scale fixed legacy typography through the application preference; keep geometry intact.
combined=combined.replace(/font-size:(\d+(?:\.\d+)?)px/g,'font-size:calc($1px * var(--text-scale,1))');
await fs.writeFile(out+'/legacy-r12.css',combined);
const app=await fs.readFile(source+'/app.js','utf8');
const icons=app.match(/  const paths=\[([\s\S]*?)\n  \];/)[1];
await fs.writeFile(out+'/legacy-icons.ts','/** Original R12 equipment-slot glyphs; no generated replacement artwork. */\nexport const LEGACY_SLOT_ICONS=['+icons+'\n] as const;\n');
await fs.writeFile('reports/local/starship-ui-polish-20261016-r19/reuse.json',JSON.stringify({source,files:records,retained:['left ship with the original twelve authored slot positions','left inline equipment inspector and stat comparison','right equipment list stays present','blue steel and gold controls, original brand and three covers','original slot icons and collision-aware layout'],cssBytes:Buffer.byteLength(combined)},null,2));
console.log(JSON.stringify({source,cssBytes:Buffer.byteLength(combined),sourceFiles:files.length}));
