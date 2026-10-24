import fs from 'node:fs/promises';
const base='reports/local/v01-20261024';let code=await fs.readFile(base+'/build-web.mjs','utf8');
code=code.replace("'startGame(529).then(app=>{globalThis.A03.app=app;", "'installImageSourceProbe();startGame(529).then(app=>{bindImageSourceProbe(app);globalThis.A03.app=app;");
code=code.replace('import * as D04 from', 'import {installImageSourceProbe,bindImageSourceProbe} from "../tools/v01-image-source-probe";import * as D04 from');
code=code.replace('main V01 observation build;', 'main V01 isolated image source candidate;');
await fs.writeFile(base+'/build-image-candidate.mjs',code);
