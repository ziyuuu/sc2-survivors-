import {decodeDds} from './dds-png.mjs';
/** DDS cubemaps store +X,-X,+Y,-Y,+Z,-Z, each with its complete mip chain. */
export function decodeMaterialDds(bytes){
 const cube=!!(bytes.readUInt32LE(112)&0x200);
 if(!cube)return [decodeDds(bytes)];
 if((bytes.readUInt32LE(112)&0xfc00)!==0xfc00)throw Error('Incomplete original DDS cubemap');
 const width=bytes.readUInt32LE(16),height=bytes.readUInt32LE(12),mips=Math.max(1,bytes.readUInt32LE(28));
 const format=bytes.subarray(84,88).toString(),compressed=['DXT1','DXT3','DXT5'].includes(format),pixelBytes=bytes.readUInt32LE(88)/8;
 let faceBytes=0;for(let mip=0;mip<mips;mip++){const w=Math.max(1,width>>mip),h=Math.max(1,height>>mip);faceBytes+=compressed?Math.ceil(w/4)*Math.ceil(h/4)*(format==='DXT1'?8:16):w*h*pixelBytes;}
 if(bytes.length<128+6*faceBytes)throw Error('Truncated original DDS cubemap');
 return Array.from({length:6},(_,face)=>decodeDds(Buffer.concat([bytes.subarray(0,128),bytes.subarray(128+face*faceBytes,128+(face+1)*faceBytes)])));
}
