import fs from 'node:fs/promises';
import path from 'node:path';
import {WASI} from 'node:wasi';
// Local WASI preopen is restricted to the explicitly selected sample directory.
const dir=path.resolve(process.argv[2]),args=process.argv.slice(3);
const wasi=new WASI({version:'preview1',args:['basisu',...args],preopens:{'/work':dir},returnOnExit:true});
const module=await WebAssembly.compile(await fs.readFile(path.join(dir,'basisu_st.wasm'))),instance=await WebAssembly.instantiate(module,wasi.getImportObject());
process.exitCode=wasi.start(instance);
