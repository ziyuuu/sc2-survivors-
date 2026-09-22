/** JSON/HTML-safe radix 85. Excludes quotes, slashes, markup and escape characters.
 * Fixed five-character groups encode four bytes; the exact byte count removes tail padding. */
const alphabet=Array.from({length:94},(_,i)=>String.fromCharCode(i+33)).filter(c=>!['"',"'",'\\','<','>','&','`','/','='].includes(c)).join('');
const codes=Int16Array.from({length:128},()=>-1);
for(let i=0;i<alphabet.length;i++)codes[alphabet.charCodeAt(i)]=i;
/** @param {Uint8Array} bytes */
export function encode85(bytes){
 const blocks=[];let part='';
 for(let i=0;i<bytes.length;i+=4){let value=bytes[i]*16777216+(bytes[i+1]??0)*65536+(bytes[i+2]??0)*256+(bytes[i+3]??0),word='';
  for(let j=0;j<5;j++){const digit=value%85;word=alphabet[digit]+word;value=Math.floor(value/85);}part+=word;
  if(part.length>=16380){blocks.push(part);part='';}
 }if(part)blocks.push(part);return blocks.join('');
}
/** @param {string} data @param {number} size */
export function decode85(data,size){
 if(!Number.isSafeInteger(size)||size<0||data.length!==Math.ceil(size/4)*5)throw Error('无效的资源编码长度');
 const bytes=new Uint8Array(Math.ceil(size/4)*4);
 for(let i=0,k=0;i<data.length;i+=5,k+=4){let value=0;
  for(let j=0;j<5;j++){const code=data.charCodeAt(i+j),digit=code<128?codes[code]:-1;if(digit<0)throw Error('无效的资源编码字符');value=value*85+digit;}
  if(value>4294967295)throw Error('资源编码溢出');
  bytes[k]=value>>>24;bytes[k+1]=value>>>16;bytes[k+2]=value>>>8;bytes[k+3]=value;
 }return bytes.subarray(0,size);
}
