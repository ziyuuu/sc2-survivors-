import fs from 'node:fs/promises';
import path from 'node:path';
import {HEROES} from '../src/data/heroes';
import {SC2_UNITS} from '../src/data/sc2-units';
import {ELITES} from '../src/data/elites';

const root='reports/local/hero-iteration';
const audit=JSON.parse(await fs.readFile(root+'/content-audit.json','utf8'));
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const raceNames={terran:'人族',zerg:'虫族',protoss:'神族'};
const kinds={hero:'英雄',ordinary:'普通兵',elite:'精英'};
const cards=[];
for(const row of audit.rows){
 const hero=HEROES[row.id as keyof typeof HEROES];
 const elite=ELITES[row.id as keyof typeof ELITES];
 const family=SC2_UNITS[row.family as keyof typeof SC2_UNITS];
 const title=hero?.name??elite?.name??family?.zh??row.id;
 const source=row.kind==='hero'?`${audit.heroFilmSource}/${row.id}.webm`:`roster-playback/${row.id}.webm`;
 const exists=await fs.stat(path.join(root,source)).then(()=>true).catch(()=>false);
 const observed=row.combatPlayback;
 const finale=row.deathFinale;
 const tail=finale?`<details><summary>完整死亡退场</summary><video controls playsinline preload="none" src="death-finales-complete/${escape(finale.film)}"></video><p>${finale.kind==='hero'?'单英雄片段':'同场分隔片段；本身份位置 '+finale.position.x+' / '+finale.position.z}。原片段${finale.sourceSeconds??'缺失'}秒，运行退场${finale.runtimeSeconds}秒；不代表完整Havok还原。</p></details>`:'';
 const caption=hero?`${hero.skill} · I / III / V级 · 死亡收尾`:
  observed?`${observed.attacks}次出手 · ${Math.round(observed.damage)}实际伤害 · ${Math.round(observed.healed)}有效治疗`:'尚未完成实战录制';
 cards.push(`<article data-race="${row.race}" data-kind="${row.kind}" data-name="${escape(title+' '+row.id)}"><h2>${escape(title)}</h2><small>${raceNames[row.race as keyof typeof raceNames]} · ${kinds[row.kind as keyof typeof kinds]} · ${escape(row.id)}</small>${exists?`<video controls playsinline preload="none" src="${source}"></video>`:'<p class="missing">录像待补</p>'}<p>${escape(caption)}</p>${tail}${row.status==='DEATH_SOURCE_GAP'?'<p class="gap">原主体缺少可动死亡片段；当前使用主体解体，未标为原版还原。</p>':''}${elite?`<details><summary>专属效果</summary><p>${escape(elite.description)}</p></details>`:''}</article>`);
}
for(const [race,label] of Object.entries(raceNames))for(const [key,title] of [['carrier','载体死亡'],['three-heroes','三英雄、五精英与Boss预警']]){
 const source=`environment-shipping/${key}-${race}.webm`;
 if(await fs.stat(path.join(root,source)).then(()=>true).catch(()=>false))cards.push(`<article data-race="${race}" data-kind="scene" data-name="${label+title}"><h2>${label} · ${title}</h2><video controls playsinline preload="none" src="${source}"></video><p>实际模拟诊断；主观辨识度与效果强度待验。</p></article>`);
}
for(const [theme,label] of [['industrial','工业遗址'],['mar-sara','玛萨拉荒漠'],['char','查尔焦土']]){
 const source=`environment-shipping/map-${theme}.png`;
 if(await fs.stat(path.join(root,source)).then(()=>true).catch(()=>false))cards.push(`<article data-race="" data-kind="scene" data-name="${label}"><h2>${label}</h2><a href="${source}"><img style="width:100%" src="${source}" alt="${label}地图实景" loading="lazy"></a><p>主题示例；九布局、18档连通与面积另有规则验证。</p></article>`);
}
await fs.writeFile(root+'/visual-review.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>三族战斗表现 · 本地验收</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0b1118;color:#e4ecf2;font:16px/1.6 system-ui,"Microsoft YaHei",sans-serif}header{padding:24px max(20px,4vw);border-bottom:1px solid #304353}h1{font-size:24px;margin:0}header p{max-width:80ch;color:#b8c6d2}nav{position:sticky;top:0;z-index:1;background:#111c28;display:flex;flex-wrap:wrap;gap:12px;padding:12px max(20px,4vw)}select,input{font:inherit;color:inherit;background:#1a2b3a;border:1px solid #506579;border-radius:4px;min-height:44px;padding:6px 12px}main{padding:24px max(20px,4vw);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:20px}article{padding:16px;border:1px solid #304353;background:#111b26;border-radius:6px}h2{font-size:18px;margin:0}small{color:#a9bdce}video{width:100%;display:block;margin-top:12px;background:#050a0f;aspect-ratio:16/10}article p{margin:10px 0 0}.gap,.missing{color:#f4ca80}summary{cursor:pointer;min-height:44px;padding-top:10px}article[hidden]{display:none}output{align-self:center;color:#b8c6d2}</style>
<header><h1>三族战斗表现 · 本地验收</h1><p>18名英雄、30普通家族与90款精英。每段使用独立诊断目标和真实模拟事件，供检查模型、动作、弹道及死亡；不代表自然关卡平衡、性能或已获人工签收。短片仅存于本机，没有上传。</p><p>英雄依次展示I、III、V级技能和死亡。普通／精英片段记录实际交战；部分早期片段开头仍可见上一段残骸，可跳至中段查看当前主体。未触发的条件型机制仍需专门场景。</p></header>
<nav><select id="race" aria-label="种族"><option value="">所有种族</option><option value="terran">人族</option><option value="zerg">虫族</option><option value="protoss">神族</option></select><select id="kind" aria-label="类型"><option value="hero">英雄</option><option value="ordinary">普通兵</option><option value="elite">精英</option><option value="scene">战场与载体</option><option value="">全部项目</option></select><input id="search" placeholder="查找单位" aria-label="查找单位"><output id="count"></output></nav><main>${cards.join('\n')}</main>
<script>const cards=[...document.querySelectorAll('article')],race=document.querySelector('#race'),kind=document.querySelector('#kind'),search=document.querySelector('#search');function filter(){let count=0;for(const card of cards){const show=(!race.value||card.dataset.race===race.value)&&(!kind.value||card.dataset.kind===kind.value)&&card.dataset.name.toLowerCase().includes(search.value.toLowerCase());card.hidden=!show;if(show)count++;else card.querySelector('video')?.pause()}document.querySelector('#count').textContent=count+'项'}for(const input of [race,kind,search])input.addEventListener('input',filter);document.addEventListener('play',e=>{for(const video of document.querySelectorAll('video'))if(video!==e.target)video.pause()},true);filter();</script></html>`);
console.log(JSON.stringify({gallery:root+'/visual-review.html',identities:audit.rows.length,scenes:cards.length-audit.rows.length,heroFilmSource:audit.heroFilmSource,fullCombatRecorded:audit.fullCombatRecorded}));
