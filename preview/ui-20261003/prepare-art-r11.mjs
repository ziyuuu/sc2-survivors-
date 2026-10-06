import fs from 'node:fs/promises';
import {UNIT_PAINTINGS,ELITE_PAINTINGS,HERO_PAINTINGS} from './unit-illustrations-r10.mjs';

// Production briefs only. This script performs no image generation or upload.
// All scenes are authored for this static iteration; runtime rules remain intact.
const root=new URL('./',import.meta.url);
const fixture=JSON.parse(await fs.readFile(new URL('cards-r9.json',root),'utf8'));
const scenes={
 marine:['废弃殖民地的街口与被子弹打碎的混凝土掩体','round shoulder pauldrons, amber glass helmet visor, powered armored boots, C-14 gauss rifle held in both hands'],
 marauder:['被轰穿的厚钢门与粗重管道构成的工厂突破口','very bulky Terran power armor, two enormous forearm grenade launchers, compact head set low between the shoulders'],
 reaper:['烟雾中的高差平台、受焰流灼烧的着陆边缘','agile Terran infantry, recognizable twin pistol silhouette and prominent rear jetpack, long human proportions'],
 hellion:['焦黑的高速公路、低位火线与轮胎划过的碎石','low four-wheeled Terran attack buggy with a front-mounted flamethrower and exposed wheel suspension'],
 tank:['斜向炮阵、支撑脚周围的弹坑与远处的堡垒','Terran siege tank, heavy treads, angular hull and long artillery barrel; siege supports retain its iconic silhouette'],
 thor:['巨型维修架的外部与导弹划过的高空','massive bipedal Terran assault mech with broad shoulders, twin heavy arm cannons and visible shoulder missile batteries'],
 viking:['低云中的空战航道，地平线下可见着陆机库','Terran twin-fuselage transformable fighter, central cockpit, folded landing-joint geometry and recognizable angular wings'],
 banshee:['暗色峡谷中的隐蔽航线与旋翼吹散的薄雾','Terran Banshee gunship with two unmistakable shrouded rotors, narrow forward cockpit and underslung weapons'],
 medivac:['夜间撤离地点的救援探照灯与降落扬尘','Terran medical dropship, two large side engines, armored crew cockpit, medical hull markings and belly medical emitter'],
 science_vessel:['维修坞之外的受损装甲与漂浮零件','classic Science Vessel spherical industrial hull, ringlike engineering structures, protruding sensor and repair arms'],
 zergling:['被疾奔镰爪刨开的菌毯，低矮裂谷中的飞尘','small low-running Zerg predator, two long sickle claws, sharply raised segmented dorsal spines and digitigrade hind limbs'],
 baneling:['被酸液蚀开的菌毯裂缝与湿润绿色薄雾','small low Zerg creature with oversized translucent green acidic sacs integrated into an organic chitin body'],
 roach:['酸液积水的洞穴口与破碎的重甲残片','low sturdy Zerg Roach, overlapping heavy carapace plates, multiple crawling legs and a forward acid-spitting mouth'],
 ravager:['火山岩与酸雨蚀痕，背囊暖光映到附近的岩面','tall Zerg Ravager, bulky hunched organic body, enormous luminous bile sacs across the back and powerful forelimbs'],
 hydralisk:['潮湿巢穴口、菌毯和斜向针刺撞击的岩壁','iconic snake-bodied Zerg Hydralisk with a long coiled tail, broad spined hood, two curved scythe arms and fang-filled mouth'],
 queen:['发光的孵化囊、菌毯脉络与巢穴中的浅雾','Zerg Queen with a tall spined crest, multiple long articulated legs, armored abdomen and recognizable brood-mother posture'],
 lurker:['成排尖刺顶破的地表、剖开的岩层与菌毯','very low broad Zerg Lurker, splayed pointed limbs, layered flattened carapace and sharp dorsal spines'],
 mutalisk:['尖顶巢穴上空的风与弯曲刃虫掠过的轨迹','flying Zerg Mutalisk with large leathery membrane wings, organic ribbing and the characteristic curved tail weapon'],
 corruptor:['高空的有机浮尘、酸液腐蚀的舰甲碎片','floating Zerg Corruptor, heavy upper chitin carapace, hanging tentacles and an organic air-to-air acid weapon'],
 ultralisk:['被巨刃推开的树林、碎石与低层菌毯烟尘','enormous quadrupedal Zerg Ultralisk, gigantic paired tusklike Kaiser blades, heavy ridged carapace and dense muscular body'],
 zealot:['破损圣堂台阶、暖色石材与灵能反光','tall mouthless Protoss warrior with a long alien head, ornate curved gold armor and two cyan forearm psi blades'],
 adept:['暮光圣堂的侧廊与正在消退的灵能残影','slender Protoss Adept with red-gold ritual armor, flowing cloth elements and its distinctive crescent glaive weapon'],
 stalker:['暗色奈拉齐姆遗迹与相位光留下的空间痕迹','Nerazim Protoss Stalker, four splayed mechanical legs, angular dark hull, glowing central head and forward particle emitter'],
 sentry:['断裂晶体之间的守护节点与近地力场光纹','small hovering Protoss Sentry, round luminous central crystal core suspended inside ornate gold metal lobes'],
 immortal:['被炮击击裂的黄金防线与折射屏障','heavy four-legged Protoss Immortal walker, massive rounded golden armor, paired arm cannons and a visible frontal barrier'],
 colossus:['深谷两侧的高大遗迹与双射线灼烧的地面','towering Protoss Colossus, very long arched stilt legs and an elongated golden central hull with paired thermal beam emitters'],
 high_templar:['风暴压暗的圣堂祭坛与悬浮石块','mouthless Protoss High Templar in long ceremonial robes and gold armor, elongated head, glowing hands gathering psionic lightning'],
 phoenix:['行星高空的航道与被引力抬起的碎片','sleek curved Protoss Phoenix starfighter with a recognizable crescent silhouette, twin ion weapons and blue rear engine light'],
 void_ray:['深空的晶体尘埃与聚焦光束照亮的舰甲','Protoss Void Ray, long prismatic forward emitter, swept curved gold hull arms and an intensely focused blue energy beam'],
 carrier:['星云边缘的黄金舰队航道与拦截机尾迹','enormous elongated Protoss Carrier with ornate golden hull, glowing blue core and clearly identifiable interceptor launch bays']
};
const heroScenes={
 swann:['工业船坞、正在焊接的装甲与暖色飞溅','Rory Swann, rugged bearded Terran engineer with a large mechanical prosthetic arm, work goggles and a repair cannon'],
 tosh:['烟雾中的阴影走廊与幽魂灵能折射','Gabriel Tosh, dark-skinned Terran spectre with long dreadlocks, large rifle and rugged covert armor'],
 yamato_battlecruiser:['低轨道的巨大舰影与正在充能的大和炮','iconic Terran battlecruiser with a huge hammerhead bow, layered industrial armored hull and a front Yamato emitter'],
 stukov:['被感染的军事走廊与有机组织覆盖的钢壁','Alexei Stukov, infested Terran admiral with peaked military cap, recognizable human upper torso and huge mutated organic arm'],
 niadra:['虫群母巢、孵育囊与柔和生体光脉','Niadra Zerg broodmother, tall narrow crown, long organic limbs and distinctive spined brood-mother anatomy'],
 hots_leviathan:['行星上空的巨型有机舰体与卷曲触须','Heart of the Swarm Leviathan, enormous flying organic Zerg battleship with immense carapace and long hanging tentacles'],
 alarak:['塔达林祭坛、黑石与红色灵能反光','Alarak, tall mouthless Protoss Highlord with black-red Tal darim armor, sharp crown and large crimson psi blades'],
 vorazun:['奈拉齐姆暗影遗迹与紫色折射烟雾','Vorazun, slender female Protoss dark templar in dark violet armor and sweeping cloak, curved glowing warp blade'],
 purifier_flagship:['净化者舰队空间、白金舰甲与耀眼核心','massive Purifier Protoss flagship, white and gold elongated warship hull, huge blue energy core and interceptor launch structures']
};
const style='StarCraft II cinematic digital painting. Mature realistic proportions, weighty armor and deeply textured material, painterly atmospheric depth, dramatic directional light. No cartoon, chibi, low-poly/vector geometry, UI, letters, numbers, badges, watermarks or picture frame.';
const layout='Production layered card plate, square PNG with genuine alpha. The UPPER HALF is a complete wide environment painting with NO characters or friendly troop silhouettes. The LOWER HALF contains exactly ONE isolated full-body subject centered with generous transparent margins, no ground, no backdrop and no other bodies. The subject receives the same light colors as the upper environment. Keep the halves strictly separate without a divider or text. This allows the frontend to place 1, 2, 3 or 6 full-size painted bodies on one scene using transparent compositing; do not draw a fake checkerboard.';
const manifest=[];
for(const [family,[race,identity]] of Object.entries(UNIT_PAINTINGS)){
 const [scene,subject]=scenes[family];
 const name=fixture.families[race].find(f=>f.id===family).name;
 manifest.push({key:family,race,family,name,kind:'ordinary',identity,scene,subject,prompt:`Use case: stylized-concept\nAsset type: layered intermission card illustration plate\nSubject: ${subject}. Exactly one unit.\nScene/backdrop: ${scene}.\nStyle/medium: ${style}\nComposition/framing: ${layout}\nLighting/mood: one coherent key light and soft atmospheric rim; clear readable head, weapon, limbs and full silhouette. No pasted hard black edge.`});
}
for(const card of fixture.cards.filter(c=>c.subtype==='eliteVariant'&&c.rarity==='purple')){
 const [feature,color,trait]=ELITE_PAINTINGS[card.sourceId];
 const base=manifest.find(x=>x.key===card.family);
 const eliteScene=`${base.scene}；把${trait}产生的光、运动和命中痕迹融入环境，形成这一精英独有的战斗瞬间`;
 manifest.push({key:card.sourceId,race:card.race,family:card.family,name:card.name,kind:'elite',identity:base.identity,feature,trait,color,scene:eliteScene,subject:base.subject,prompt:`Use case: stylized-concept\nAsset type: layered elite intermission card illustration plate\nSubject: exactly ONE ${base.subject}. This elite has: ${trait}. Show a clear structural armor/weapon/anatomy difference plus a distinct action pose that expresses this trait, while retaining its unmistakable base-unit identity.\nScene/backdrop: ${eliteScene}. Do not put extra soldiers or body silhouettes in the background; the environment carries impact and directional atmosphere.\nStyle/medium: ${style}\nComposition/framing: ${layout}\nLighting/mood: coherent material reflections and atmosphere, restrained ${color} accent appropriate to its existing weapon or organic ability; accent alone cannot identify the elite.`});
}
for(const [hero,[race,identity]] of Object.entries(HERO_PAINTINGS)){
 const [scene,subject]=heroScenes[hero];
 manifest.push({key:hero,race,hero,name:fixture.heroes[hero].name,kind:'hero',identity,scene,subject,prompt:`Use case: stylized-concept\nAsset type: layered hero intermission card illustration plate\nSubject: exactly ONE ${subject}; imposing proportions and unmistakable face/ship silhouette.\nScene/backdrop: ${scene}.\nStyle/medium: ${style}\nComposition/framing: ${layout}\nLighting/mood: rich painterly depth, coherent light across body and setting, restrained epic scale.`});
}
const first=['marine','marine.2','hydralisk','hydralisk.2','zealot','zealot.3'];
const result={revision:'r11-art-production-brief',status:'authorized-text-only-imagegen-with-detailed-review',authorization:'2026-10-05 user: 可以的，生成可以，但要检查和精细。另外删掉这个规定',sourceFixture:'cards-r9.json',counts:{ordinary:30,elite:90,additionalHeroes:9,retainedHeroCovers:9},firstPass:first,layout:{background:[0,0,1,.5],body:[0,.5,1,.5],bodyScalePolicy:'constant for each screen layout; only translate and change draw order for count'},assets:manifest};
if(manifest.length!==129||new Set(manifest.map(a=>a.key)).size!==129)throw new Error('Art brief coverage mismatch');
await fs.mkdir(new URL('art-r11/',root),{recursive:true});
await fs.writeFile(new URL('art-r11/briefs-r11.json',root),JSON.stringify(result,null,2)+'\n');
await fs.writeFile(new URL('art-r11/first-pass-prompts.txt',root),first.map(key=>{const a=manifest.find(x=>x.key===key);return `${a.key} / ${a.name}\n${a.prompt}`;}).join('\n\n---\n\n')+'\n');
console.log(JSON.stringify({status:result.status,ordinary:30,elite:90,additionalHeroes:9,firstPass:first,remoteCalls:0},null,2));
