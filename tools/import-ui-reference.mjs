import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const source='preview/ui-20261003',dest='src/ui/presentation';
const stack=['style.css',...['2','3','4','5','6','7','8','9','10','11','12'].map(n=>'style-r'+n+'.css')];
const records=[];let result='/* Original R7/R8, R11 and R12 styles in their approved cascade order.\n * This copy is presentation only; the preserved preview stays byte-identical. */\n';
for(const name of stack){const bytes=await fs.readFile(source+'/'+name);records.push({file:source+'/'+name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});result+='\n/* '+name+' */\n'+bytes.toString('utf8')+'\n';}
// Selector aliases only: the runtime frame has a different DOM host ID.
await fs.writeFile(dest+'/reference-r12.css',result.replaceAll('#scene','#interface .reference-page'));
const app=await fs.readFile(source+'/app.mjs','utf8'),glyph=app.match(/const glyphs=(\{[^\r\n]+\});/);
if(!glyph)throw Error('Original icon dictionary missing');
await fs.writeFile(dest+'/reference-glyphs.ts','// Original approved interface icons; copied without redrawing.\nexport const REFERENCE_GLYPHS:Record<string,string> = '+glyph[1]+';\n');
const mapStart=app.indexOf('<svg class="minimap-chassis"'),mapEnd=app.indexOf('</svg>',mapStart)+6;
if(mapStart<0||mapEnd<6)throw Error('Original minimap housing missing');
await fs.writeFile(dest+'/reference-minimap.ts','// Original approved minimap housing. The screen is the actual live map.\nexport const MINIMAP_CHASSIS = '+JSON.stringify(app.slice(mapStart,mapEnd))+';\n');
await fs.writeFile('reports/local/ui-fidelity-round-20261006/reference-import.json',JSON.stringify({source:'SC2-UI-Preview-r12.html and preserved module sources',stack:records,glyphSource:'preview/ui-20261003/app.mjs'},null,2));
const cardModule=await fs.readFile(source+'/card-ui-r11.mjs','utf8');
const engraving=cardModule.slice(cardModule.indexOf(' function artDrawing(c){'),cardModule.indexOf(' function cardArt(c){'));
if(!engraving.includes('const paths='))throw Error('Original engravings missing');
await fs.writeFile(dest+'/reference-engraving.ts','// Exact engravings from the approved R11 card module. No preview economy or commands.\n'+engraving.replace(' function artDrawing(c){','export function referenceEngraving(c:{id:string;art:string;race:string}){').replace('const paths={','const paths:Record<string,string>={'));
const talentCopy=JSON.parse(await fs.readFile(source+'/talent-copy-r5.json','utf8'));
await fs.writeFile(dest+'/talent-presentation.generated.ts','// Approved presentation names and flavour only. Effects come from the current talent definitions.\nexport const TALENT_PRESENTATION:Record<string,{name:string;flavour:string}> = '+JSON.stringify(Object.fromEntries(Object.entries(talentCopy).map(([id,c])=>[id,{name:c.name,flavour:c.flavour}])))+';\n');
const cardFixture=JSON.parse(await fs.readFile(source+'/cards-r9.json','utf8'));
const presentation=cardFixture.cards.map(c=>({race:c.race,sourceId:c.sourceId,group:c.group,subtype:c.subtype,family:c.family??c.families?.[0]??null,heroId:c.heroId??null,art:c.art,flavour:c.summary,kicker:c.kicker,icon:c.icon,rank:c.rank??null}));
const unique=[...new Map(presentation.map(c=>[JSON.stringify(c),c])).values()];
await fs.writeFile(dest+'/card-presentation.generated.ts','// Approved card illustration/copy metadata only. No prototype prices, effects, names, wallets or armies.\nexport interface CardPresentation {race:string;sourceId:string;group:string;subtype:string;family:string|null;heroId:string|null;art:string;flavour:string;kicker:string;icon:string;rank:number|null}\nexport const CARD_PRESENTATION:readonly CardPresentation[] = JSON.parse('+JSON.stringify(JSON.stringify(unique))+');\n');
const worldLabels=(await fs.readFile('src/ui/hero-map-ui.css','utf8')).split(/\r?\n/).filter(line=>line.startsWith('.pod-world-label')).join('\n');
await fs.writeFile(dest+'/world-labels.css','/* Preserved existing world labels; the old menu typography overrides are retired. */\n:root{--game-copy:calc(16px * var(--text-scale));--game-detail:calc(14px * var(--text-scale));--game-mark:calc(12px * var(--text-scale))}\n'+worldLabels+'\n');
console.log(JSON.stringify({styles:stack.length,bytes:Buffer.byteLength(result),glyphSourceBytes:glyph[1].length,engravingBytes:engraving.length}));
