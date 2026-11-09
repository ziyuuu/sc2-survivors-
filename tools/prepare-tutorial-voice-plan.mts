import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {shortTutorialScript} from '../src/data/tutorial-script';
import {TUTORIAL_ADVISORS} from '../src/data/tutorial';
const common=new Set<string>(['首次出征，是否先学习移动、发展、增援和装备？','这是旗舰模块，撤离后可以安装。']);
for(const file of ['src/ui/tutorial-guided.ts'])for(const match of (await fs.readFile(file,'utf8')).matchAll(/'([^'\n]*[\u3400-\u9fff][^'\n]*)'/g))common.add(match[1]);
const rows=[];
for(const race of ['terran','protoss'] as const){
 const texts=new Set([...common,...shortTutorialScript(race).map(s=>s.text),...Object.values(TUTORIAL_ADVISORS[race].lines)]);
 for(const text of texts){const key=createHash('sha256').update(text).digest('hex').slice(0,20);rows.push({race,text,key,voice:race==='terran'?'Microsoft Huihui':'Microsoft Kangkang'});}
}
await fs.mkdir('assets/generated/tutorial-voices-20261109',{recursive:true});
await fs.writeFile('assets/generated/tutorial-voices-20261109/plan.json',JSON.stringify({date:'2026-11-09',authorization:'User approved offline Huihui/Kangkang samples in chat; Queen remains nonverbal.',rows},null,2));
console.log({clips:rows.length});
