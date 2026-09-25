import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectGlb} from './glb-inspect.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const definitions=[...read('tools/expansion-models.json'),...read('tools/three-race-models.json'),...read('tools/three-race-elite-models.json')];
const imported=read('assets/private/m3-pack.json'),runtime=read('reports/local/runtime-assets.json');
const all={};
for(const d of definitions){
 const record=imported.manifest.find(a=>a.id===d.id),registered=runtime.find(a=>a.id===d.id);let converted=false,animations=[];
 try{const bytes=fs.readFileSync(record.packedFile),inspected=inspectGlb(bytes);converted=createHash('sha256').update(bytes).digest('hex')===record.sha256&&inspected.externalResources.length===0;animations=inspected.animationNames;}catch{}
 all[d.id]={modelAssetId:d.id,sourceModelId:d.modelDataId,sourceAssetPath:d.assetPath,sourceBuild:record?.sourceBuild??null,sourceIdentityVerified:!!d.modelDataId,sourceBytesVerified:record?.sourceTransport==='CASC public CDN'&&!!record.sourceSha256,converted,animationsListed:animations.length>0,runtimeAvailable:registered?.status==='available',humanVisualVerified:record?.verification?.humanVisual===true,animationNames:animations,bytes:registered?.bytes??0,error:imported.failures.find(a=>a.id===d.id)?.error??null};
}
const output=`/** Generated from actual local conversion and runtime manifests. Structural checks do not imply human visual approval. */
export interface ExpansionContentReadiness {modelAssetId:string;sourceModelId:string;sourceAssetPath:string;sourceBuild:string|null;sourceIdentityVerified:boolean;sourceBytesVerified:boolean;converted:boolean;animationsListed:boolean;runtimeAvailable:boolean;humanVisualVerified:boolean;animationNames:readonly string[];bytes:number;error:string|null;}
export const EXPANSION_CONTENT_READINESS:Readonly<Record<string,ExpansionContentReadiness>>=`+JSON.stringify(all,null,2)+`;
export function isExpansionModelReady(id:string):boolean {const r=EXPANSION_CONTENT_READINESS[id];return !!r&&r.sourceBytesVerified&&r.converted&&r.animationsListed&&r.runtimeAvailable;}
`;
fs.writeFileSync('src/data/expansion-content-readiness.ts',output);
const failed=Object.values(all).filter(a=>!a.sourceBytesVerified||!a.converted||!a.animationsListed||!a.runtimeAvailable);
fs.writeFileSync('reports/local/three-race-content-readiness.json',JSON.stringify({generatedAt:new Date().toISOString(),sourceProfiles:{ordinary:'5.0.15 export fbbd6429b1eb6978c78a092dc68ba09029d03171; fixed declared layers',scienceVessel:'5.0.16.97563 Liberty campaign and LibertyStory production, explicit separate adapter',originalArt:'5.0.16.97563 CASC original bytes'},models:all,structuralFailures:failed.map(a=>a.modelAssetId),humanVisualComplete:false},null,2));
console.log(`Readiness: ${Object.keys(all).length-failed.length}/${Object.keys(all).length} structurally ready; visual approval remains separate.`);
