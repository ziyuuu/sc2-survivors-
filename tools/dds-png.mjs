import {deflateSync} from 'node:zlib';
// SC2 pack uses BC1/DXT1 and BC3/DXT5. Decode the highest mip locally in Node.
// Format: https://learn.microsoft.com/en-us/windows/win32/direct3d10/d3d10-graphics-programming-guide-resources-block-compression
export function decodeDds(b){
 if(b.length<128||b.subarray(0,4).toString()!=='DDS '||b.readUInt32LE(4)!==124)throw Error('Invalid DDS header');
 const width=b.readUInt32LE(16),height=b.readUInt32LE(12),format=b.subarray(84,88).toString();
 if(!width||!height||width>8192||height>8192)throw Error('Unsupported DDS dimensions');
 // Original campaign hero icons also use uncompressed masked RGB(A).
 if((b.readUInt32LE(80)&0x40)!==0&&(b.readUInt32LE(80)&0x4)===0){
  const bits=b.readUInt32LE(88),pixelBytes=bits/8;
  if(![16,24,32].includes(bits))throw Error('Unsupported DDS RGB bit depth: '+bits);
  const rowBytes=width*pixelBytes,pitch=(b.readUInt32LE(8)&8)?b.readUInt32LE(20):rowBytes;
  if(pitch<rowBytes||b.length<128+pitch*height)throw Error('Truncated DDS RGB mip');
  const masks=[92,96,100,104].map(offset=>b.readUInt32LE(offset));
  const channels=masks.map((mask,i)=>{if(!mask)return ()=>i===3?255:0;let shift=0;while(((mask>>>shift)&1)===0)shift++;const max=mask>>>shift;if((max&(max+1))!==0)throw Error('Unsupported non-contiguous DDS channel mask');return word=>Math.round(((word&mask)>>>shift)*255/max);});
  const rgba=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const word=b.readUIntLE(128+y*pitch+x*pixelBytes,pixelBytes),offset=(y*width+x)*4;for(let c=0;c<4;c++)rgba[offset+c]=channels[c](word);}
  return {width,height,rgba};
 }
 if(!['DXT1','DXT3','DXT5'].includes(format))throw Error('Unsupported DDS compression: '+format);
 const blockBytes=format==='DXT1'?8:16,cols=Math.ceil(width/4),rows=Math.ceil(height/4);
 if(b.length<128+cols*rows*blockBytes)throw Error('Truncated DDS mip');
 const rgba=Buffer.alloc(width*height*4),rgb=v=>{const r=(v>>11)&31,g=(v>>5)&63,bl=v&31;return [(r<<3)|(r>>2),(g<<2)|(g>>4),(bl<<3)|(bl>>2),255];};
 for(let by=0;by<rows;by++)for(let bx=0;bx<cols;bx++){
  const offset=128+(by*cols+bx)*blockBytes,c=offset+(format==='DXT1'?0:8),c0=b.readUInt16LE(c),c1=b.readUInt16LE(c+2),colors=[rgb(c0),rgb(c1)];
  if(c0>c1||format!=='DXT1'){colors.push(colors[0].map((v,i)=>Math.floor((v*2+colors[1][i])/3)));colors.push(colors[0].map((v,i)=>Math.floor((v+colors[1][i]*2)/3)));}
  else{colors.push(colors[0].map((v,i)=>Math.floor((v+colors[1][i])/2)));colors.push([0,0,0,0]);}
  const bits=b.readUInt32LE(c+4),alphas=[b[offset],b[offset+1]];let alphaBits=0;
  if(format==='DXT5'){const count=alphas[0]>alphas[1]?7:5;for(let i=1;i<count;i++)alphas.push(Math.floor(((count-i)*alphas[0]+i*alphas[1])/count));if(count===5)alphas.push(0,255);alphaBits=b.readUIntLE(offset+2,6);}
  for(let p=0;p<16;p++){const x=bx*4+p%4,y=by*4+Math.floor(p/4);if(x>=width||y>=height)continue;const color=colors[(bits>>>(p*2))&3],at=(y*width+x)*4;rgba[at]=color[0];rgba[at+1]=color[1];rgba[at+2]=color[2];rgba[at+3]=format==='DXT3'?((b[offset+Math.floor(p/2)]>>(p%2*4))&15)*17:format==='DXT5'?alphas[Math.floor(alphaBits/2**(p*3))%8]:color[3];}
 }
 return {width,height,rgba};
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,data){const b=Buffer.alloc(12+data.length);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);let crc=0xffffffff;for(const byte of b.subarray(4,8+data.length))crc=crcTable[(crc^byte)&255]^(crc>>>8);b.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);return b;}
export function ddsToPng(bytes){return rgbaToPng(decodeDds(bytes));}
export function rgbaToPng({width,height,rgba}){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 const scan=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)rgba.copy(scan,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(scan,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
