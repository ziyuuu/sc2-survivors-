// Resolve the project's extensionless local TS imports without spawning a compiler.
import {registerHooks} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
registerHooks({resolve(specifier,context,next){
 try{return next(specifier,context);}catch(error){
  if(specifier.startsWith('.')&&context.parentURL){for(const suffix of ['.ts','.mts','/index.ts']){const url=new URL(specifier+suffix,context.parentURL);if(fs.existsSync(fileURLToPath(url)))return next(url.href,context);}}
  throw error;
 }
}});
