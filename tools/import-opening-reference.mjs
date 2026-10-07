import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=await fs.readFile('preview/opening-20261007/source.html','utf8');
const css=source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
let screen=source.match(/<div class="scs-screen" aria-label="StarCraft Survivors opening with moving space background">([\s\S]*?<div class="scs-grain"[^>]*><\/div>)\s*<\/div>/)?.[0];
if(!css||!screen)throw Error('Approved opening layout missing');
const ship=screen.match(/<div class="scs-cruiser">[\s\S]*?<div class="scs-engine"><\/div><\/div>/)?.[0];
if(!ship)throw Error('Approved cruiser missing');
screen=screen.replace('<div class="scs-vignette"',ship.replace('class="scs-cruiser"','class="scs-cruiser scs-cruiser-far"')+'\n<div class="scs-vignette"');
screen=screen.replace('68%','0%').replace('aria-label="Concept loading animation"','aria-label="游戏加载"').replace('aria-valuenow="68"','aria-valuenow="0"');
screen=screen.replace('aria-label="StarCraft Survivors opening with moving space background"','aria-label="STARCRAFT SURVIVORS"');
const style=css+`\n/* Replace preview framing with the real viewport; original layer placement remains. */
#scs-opening-visual{position:fixed;inset:0;z-index:2000;width:100%;height:100%;background:#02070d;isolation:isolate}
#scs-opening-visual .scs-screen,#scs-opening-visual .scs-screen.scs-portrait{width:100%;height:100%;max-width:none;aspect-ratio:auto}
#scs-opening-visual .scs-fill{width:0}
#scs-opening-visual .scs-loader{padding-bottom:env(safe-area-inset-bottom)}
#scs-opening-visual .scs-track.is-indeterminate .scs-fill{width:18%;animation:scs-indeterminate 1.5s ease-in-out infinite alternate}
@keyframes scs-indeterminate{from{left:0}to{left:82%}}
@media(prefers-reduced-motion:reduce){#scs-opening-visual .scs-track.is-indeterminate .scs-fill{left:41%;animation:none}}
`;
const script=await fs.readFile('src/ui/presentation/opening-runtime.js','utf8');
new Function(script);
const html='<style>'+style+'</style><div id="scs-opening-visual" role="status" aria-label="游戏加载">'+screen+'</div><script>'+script+'</script>';
await fs.writeFile('src/ui/presentation/opening.generated.html',html);
const logo=screen.match(/<div class="scs-title"><img src="([^"]+)"/)?.[1];if(!logo)throw Error('Approved logo missing');
await fs.writeFile('src/ui/presentation/brand-logo.generated.ts','// Exact approved UI-thread logo; do not regenerate artwork.\nexport const BRAND_LOGO_SRC='+JSON.stringify(logo)+';\n');
const images=[...new Set(source.match(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g))].map(url=>{const bytes=Buffer.from(url.split(',')[1],'base64');return {bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
await fs.writeFile('preview/opening-20261007/provenance.json',JSON.stringify({originalThread:'01a0ff75-6cfc-7be0-b2f6-92489157b232',source:'starcraft-survivors-opening.html',sourceSha256:createHash('sha256').update(source).digest('hex'),generatedSha256:createHash('sha256').update(html).digest('hex'),images,allFiveApprovedImagesRetained:images.length===5,adaptations:['Full viewport instead of the preview carousel','Automatic portrait selection','Real startup progress instead of the 15-second demonstration loop','Reduced-motion and cleanup after entry']},null,2));
console.log(JSON.stringify({bytes:Buffer.byteLength(html),images:images.length}));
