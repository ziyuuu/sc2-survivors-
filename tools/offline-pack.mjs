import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Split only at embedded-image boundaries. Every source byte, including GLB padding,
 * survives unchanged; all clips, materials and geometry remain in the offline build. */
export function assetParts(bytes){
 if(bytes.length<12||bytes.toString('ascii',0,4)!=='glTF')return [bytes];
 if(bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('Invalid GLB header');
 let json,binOffset=0,binLength=0;
 for(let at=12;at<bytes.length;){const n=bytes.readUInt32LE(at),type=bytes.readUInt32LE(at+4);if(at+8+n>bytes.length)throw Error('Truncated GLB chunk');
  if(type===0x4e4f534a)json=JSON.parse(bytes.toString('utf8',at+8,at+8+n));
  if(type===0x004e4942){binOffset=at+8;binLength=n;}at+=8+n;
 }
 if(!json)throw Error('GLB missing JSON');
 const cuts=new Set([0,bytes.length]);
 for(const image of json.images??[]){if(image.bufferView===undefined)continue;const view=json.bufferViews?.[image.bufferView];
  if(!view||view.buffer!==0||!binOffset)throw Error('Unsupported embedded image buffer');
  const start=view.byteOffset??0,end=start+view.byteLength;if(start<0||end>binLength)throw Error('Invalid image bounds');
  cuts.add(binOffset+start);cuts.add(binOffset+end);
 }
 const ordered=[...cuts].sort((a,b)=>a-b);return ordered.slice(1).map((end,i)=>bytes.subarray(ordered[i],end));
}
export function createAssetPack(assets){
 const pack={version:1,chunks:[],assets:{}},indices=new Map();let rawBytes=0,uniqueBytes=0,storedBytes=0,partCount=0;
 for(const {id,mime,bytes} of assets){if(pack.assets[id])throw Error('Duplicate asset id: '+id);rawBytes+=bytes.length;
  const parts=assetParts(bytes).map(part=>{partCount++;const digest=hash(part);let index=indices.get(digest);if(index!==undefined)return index;
   const gzip=gzipSync(part,{level:9}),compressed=gzip.length+24<part.length,stored=compressed?gzip:part;
   index=pack.chunks.length;indices.set(digest,index);uniqueBytes+=part.length;storedBytes+=stored.length;
   pack.chunks.push({encoding:compressed?'gzip':'raw',bytes:part.length,data:stored.toString('base64')});return index;
  });
  pack.assets[id]={mime,bytes:bytes.length,sha256:hash(bytes),parts};
 }
 return {pack,stats:{assets:assets.length,partCount,chunks:pack.chunks.length,rawBytes,uniqueBytes,deduplicatedBytes:rawBytes-uniqueBytes,storedBytes,base64Bytes:pack.chunks.reduce((n,c)=>n+c.data.length,0)}};
}
