// Generate a source-only listening/reference shortlist. No runtime routing changes.
import fs from 'node:fs';
import {loadAudioSources} from './t01/audio-source.mjs';
const db=await loadAudioSources(),root='.cache/t01-all-motion';
const paths=JSON.parse(fs.readFileSync(root+'/casc-paths.json','utf8').replace(/^\uFEFF/,''));
const specs=[
 ['Dehaka_FootStep','coop','confirmed-model-walk','德哈卡实际模型 Slow Walk / Walk 01 脚步'],
 ['zZerg_moveHerdSmall_loop','melee','confirmed-herd','虫族小型单位群体移动'],
 ['zZerg_moveHerdMedium_loop','melee','confirmed-herd','虫族群体移动中层'],
 ['zZerg_moveHerdLarge_loop','melee','confirmed-herd','虫族群体移动大层'],
 ['zZerg_moveQueenHerdMedium_loop','melee','confirmed-herd','虫后群体移动中层'],
 ['zZerg_moveQueenHerdLarge_loop','melee','confirmed-herd','虫后群体移动大层'],
 ['zLocust_moveLoop','melee','confirmed-other-native-unit','原版蝗虫移动，是否用于本项目召唤物须按真实身份核对'],
 ['Barracks_Movement','melee','confirmed-building-movement','兵营飞行移动，与工厂、星港共享原版推进声；入场载体属于实体外播放路径'],
 ['zHydralisk_moveLoop','melee','inactive-source-candidate','原版刺蛇旧独立移动库；单体绑定被注释，音量 -60 dB'],
 ['zRoach_moveLoop','melee','inactive-source-candidate','原版蟑螂旧独立移动库；单体绑定被注释，音量 -60 dB'],
 ['zBaneling_moveLoop','melee','inactive-source-candidate','原版爆虫旧独立移动库；不可代替当前 Baneling_Movement'],
 ['zUltralisk_moveLoop','melee','inactive-source-candidate','原版雷兽旧独立移动库；不可代替当前 Ultralisk_Movement'],
 ['Marine02AOD_Walk','liberty','cinematic-only','陆战队员剧情模型行走，未证实普通战斗单位绑定'],
 ['Marine02AOD_Custom_Turn_Walk_Right','liberty','cinematic-only','陆战队员剧情转身行走'],
 ['SM_Marine_01_Walk','liberty','cinematic-only','陆战队员剧情模型行走'],
 ['SM_Marine_01_Custom_Turn_Walk','liberty','cinematic-only','陆战队员剧情转身行走'],
 ['SM_Marine_01_Custom_Walk_Angry','liberty','cinematic-only','陆战队员剧情行走变体'],
 ['FS_Lrg_Hvy_Boot','coop','unbound-generic-candidate','原版重靴脚步；未证实普通陆战队员绑定'],
 ['FS_Walk_Terran_Heavy','coop','unbound-generic-candidate','原版人族重型步伐；未证实普通陆战队员绑定'],
];
const groups=specs.map(([id,profile,status,note])=>{const s=db.sound(id,profile);if(!s?.assets.length)throw Error('Unresolved shortlist bank '+id);return {id,profile,status,note,source:s.chain,volume:s.fields.Volume?.value,pitch:s.fields.Pitch?.value,files:[...new Set(s.assets.map(a=>a.path))]};});
// These files exist in the official archive even though the Zergling sound bank
// is currently commented out. Keep that provenance distinction explicit.
groups.push({id:'zZergling_moveLoop-raw-candidates',profile:'swarm',status:'inactive-source-candidate',note:'原版跳虫旧独立移动素材 a–l；声音库和旧绑定被注释',files:Array.from('abcdefghijkl',x=>'Assets/Sounds/zZergling_move2L'+x+'.wav')});
const requests=[];
for(const g of groups)for(const file of g.files){
 const candidates=paths.filter(p=>p.toLowerCase().endsWith('/'+file.toLowerCase())).filter(p=>!/war3/.test(p));
 if(!candidates.length)throw Error('Missing shortlist source '+file);
 const source=candidates.find(p=>p.startsWith('mods/liberty.sc2mod/'))??candidates[0];
 if(!requests.some(r=>r.source===source))requests.push({source,file,groups:groups.filter(q=>q.files.includes(file)).map(q=>q.id)});
}
fs.writeFileSync(root+'/shortlist.json',JSON.stringify({groups,requests},null,2));
console.log(JSON.stringify({groups:groups.length,files:requests.length,statuses:[...new Set(groups.map(g=>g.status))]}));
