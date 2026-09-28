import type {MapDefinition} from '../../data/map-definition';
import type {Race} from '../../data/races';
import type {Difficulty} from '../../data/stages';
import type {HeroId} from '../../data/heroes';
import {writeArchive} from '../../persistence/archive';
import {SaveRepository,type SaveBackend} from '../../persistence/save-repository';
import {FlatTerrain} from '../../simulation/movement/flat-terrain';
import {MapTerrain} from '../../simulation/movement/map-terrain';
import {PermanentProfile} from '../../simulation/progression/permanent-profile';
import {World} from '../../simulation/world';
import type {MiniPlatform} from './asset-cache';
import {WeChatAssetCache} from './asset-cache';

/** Game rules and archive format are identical to the browser edition. */
export class WeChatGameSession {
 readonly world:World;
 private saves:SaveRepository;
 private constructor(map:MapDefinition,backend:SaveBackend,profile:PermanentProfile){
  this.world=new World({terrain:new MapTerrain(map),endlessTerrain:new FlatTerrain(),permanentProfile:profile,race:profile.activeRace});
  this.saves=new SaveRepository(backend);
 }
 static async open(wx:MiniPlatform,cache:WeChatAssetCache,backend:SaveBackend){
  const file=await cache.prepareOne('map.kairos');
  const map=JSON.parse(wx.getFileSystemManager().readFileSync(file,'utf8')) as MapDefinition;
  const loaded=await new SaveRepository(backend).load(),profile=new PermanentProfile();
  if(loaded.notice&&!loaded.bundle)throw Error('小游戏存档无法验证；保留原文件并停止启动：'+loaded.notice);
  if(loaded.bundle&&!profile.importJSON(loaded.bundle.profile))throw Error('永久档案无效');
  const session=new WeChatGameSession(map,backend,profile);
  if(loaded.bundle?.run)session.world.restoreRun(loaded.bundle.run);
  return session;
 }
 newRun(race:Race,difficulty:Difficulty,starterHero?:HeroId){
  if(this.world.phase!=='menu')this.world.resetRun();
  if(!this.world.selectRace(race)||!this.world.setDifficulty(difficulty)||!this.world.start(starterHero))throw Error('新局启动失败');
  return this.save();
 }
 step(){
  if(this.world.phase==='battle'&&!this.world.paused&&!this.world.requiresPlayerDecision)this.world.step();
 }
 async hide(){
  if(this.world.phase==='battle'){this.world.paused=true;this.world.changed();}
  await this.save();
 }
 async save(){
  const run=this.world.runId&&this.world.phase!=='menu'?this.world.captureRun():null;
  await this.saves.commit(writeArchive({profile:this.world.permanentProfile.exportJSON(),run}));
 }
}
