import fs from 'node:fs/promises';
await fs.mkdir('public/assets/audio',{recursive:true});
let seed=123;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const [name,duration,freq] of [['shot',.09,90],['blast',.35,48],['alert',.45,620]]){
 const rate=22050,n=Math.floor(duration*rate),b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++){const t=i/rate,envelope=Math.exp(-t/duration*6)*Math.min(1,t*800);const noise=name==='alert'?0:(random()-.5)*.7;const tone=Math.sin(t*Math.PI*2*freq*(name==='alert'?1:1-t/duration*.5));b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round((tone*.3+noise)*envelope*26000))),44+i*2);}await fs.writeFile(`public/assets/audio/${name}.wav`,b);
}
