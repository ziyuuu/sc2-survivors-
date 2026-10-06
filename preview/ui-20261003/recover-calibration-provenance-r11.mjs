import fs from 'node:fs/promises';
const root=new URL('art-r11/',import.meta.url),folder='C:/Users/zyuu/.codex/generated_images/01a0ff75-6cfc-7be0-b2f6-92489157b232/';
const sources={
 'marine.png':'exec-d556ba11-fe0e-4fef-bab9-018857e9fe93.png',
 'hydralisk-v2.png':'exec-96cf26b9-9222-4206-83f2-5d24cdb17ab1.png',
 'zealot-v2.png':'exec-3e2efeb4-589e-4b68-97df-ad1606d08676.png',
 'marine.2-v2.png':'exec-c454cc1d-bea0-46e5-a400-f37b810f77f1.png'
};
for(const [file,source] of Object.entries(sources)){
 const output=await fs.readFile(new URL(file,root)),original=await fs.readFile(folder+source);
 if(!output.equals(original))throw new Error('Recovered source differs: '+file);
 const record={output:file,source:folder+source,tool:'built-in image_gen',intent:file==='marine.png'?'new-text-only-illustration':'edit-previous-newly-generated-calibration',privateReferencesUploaded:false,exactPrompt:null,promptReceiptStatus:'Local receipt writing initially failed because btoa was unavailable in the orchestration isolate. The exact executed prompt is not reconstructed or claimed here. Output path and byte-identical master were recovered from the original tool response; production brief remains available separately.'};
 await fs.writeFile(new URL(file.replace('.png','.provenance-recovered.json'),root),JSON.stringify(record,null,2)+'\n');
}
console.log(JSON.stringify({byteIdenticalRecoveredMasters:Object.keys(sources).length,exactPromptReceipt:'unavailable for these four calibrations; no fabricated replay record'}));
