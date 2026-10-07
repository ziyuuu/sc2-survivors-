import {readFileSync} from 'node:fs';
export default function openingPlugin(){return {name:'sc2-approved-opening',transformIndexHtml(html){return html.replace('<!--SC2_OPENING-->',readFileSync('src/ui/presentation/opening.generated.html','utf8'));}};}
