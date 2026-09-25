import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
/** Only newly downloaded source caches were relocated when D: filled up. Runtime GLBs stay in public/. */
export const sourceCacheRoot=process.env.SC2_V26_SOURCE_CACHE??path.join(os.tmpdir(),'sc2-v26-assets');
export function localSourceFile(projectRelative){
 if(fs.existsSync(projectRelative))return projectRelative;
 const normalized=projectRelative.replaceAll('\\','/');
 if(!/^assets\/private\/(?:m3|dds)\/[^/]+$/.test(normalized))return projectRelative;
 const cached=path.join(sourceCacheRoot,normalized);
 return fs.existsSync(cached)?cached:projectRelative;
}
