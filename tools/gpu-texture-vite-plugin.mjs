/** Packed entries execute from Blob URLs. The explicit, same-origin transcoder
 * path is used at runtime, so remove Three's unused import.meta URL defaults. */
export default function gpuTexturePlugin(){return {name:'sc2-explicit-basis-path',enforce:'pre',transform(code,id){
 if(!id.replaceAll('\\','/').endsWith('/three/examples/jsm/loaders/KTX2Loader.js'))return;
 let count=0;const result=code.replace(/const WASM_(BIN|JS)_URL = new URL\([^;]+;/g,(_,kind)=>{count++;return `const WASM_${kind}_URL = 'about:blank';`;});
 if(count!==2)throw Error('KTX2Loader default URL contract changed');return result;
}};}
