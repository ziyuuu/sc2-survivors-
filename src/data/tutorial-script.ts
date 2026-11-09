import type {Race} from './races';
export type GuidedStepKind='move'|'worker'|'ling'|'repair'|'drone'|'resources'|'production-on'|'production-off'|'apply'|'landing'|'boss'|'loot'|'card'|'rally'|'detail'|'equip'|'build'|'output'|'supply-round'|'supply'|'front'|'system'|'extract';
export interface GuidedStep {id:string;kind:GuidedStepKind;stage:number;text:string;after?:'dispatch'|'landing';group?:string;}
const s=(id:string,kind:GuidedStepKind,stage:number,text:string,after?:GuidedStep['after']):GuidedStep=>({id,kind,stage,text,after});
/** Explicit clicks include native Apply and construction → supply transitions. */
export function guidedScript(race:Race,version:2|3=2):GuidedStep[]{if(version===3)return shortTutorialScript(race);return [
 s('move','move',1,'点击地面标记，移动整队。'),
 s('drone','drone',1,'点击工蜂标记，靠近后自动交战。'),
 s('resources','resources',1,'点击资源标记，靠近收集矿物和瓦斯。'),
 s('train-1','production-on',1,'开启基础兵生产，准备第一批增援。'),
 s('dispatch-1','apply',1,'点击应用，支付一席训练费用。','dispatch'),
 s('pause-1','production-off',1,'暂停后续生产，已付款的增援继续训练。'),
 s('wait-1','apply',1,'点击应用，等待载体抵达。','landing'),
 s('landing-1','landing',1,'点击增援落点，清理威胁并保护载体。'),
 s('boss-1','boss',1,'点击敌军标记，靠近后自动交战。'),
 s('loot-1','loot',1,'点击散件标记，靠近拾取装备。'),
 s('card-1','card',1,'点击奖励卡，领取本族精英增援。'),
 s('rally-1','rally',1,'点击集结点，守到本关结束。'),
 s('detail-1','detail',1,'点击刚拾取的散件，查看装备。'),
 s('equip-1','equip',1,'点击装备，在关间穿上散件。'),
 s('build','build',1,race==='protoss'?'建造折跃水晶，增加生产设施。':'建造基础设施，增加生产能力。'),
 // All three canonical groups initially have their basic output selected.
 // A new crystal is the only new group with an empty output selection.
 ...(race==='protoss'?[s('output','output',1,'选择狂热者，安排水晶生产。')]:[]),
 s('train-2','production-on',1,'开启基础兵生产，安排下一关增援。'),
 s('configure-2','apply',1,'点击应用，保存下一关生产安排。'),
 s('supply-round-1','supply-round',1,'点击前往补给，查看战备选择。'),
 s('supply','supply',1,'购买高亮补给；矿气也要留给生产。'),
 s('front-2','front',1,'返回前线，接应第二批增援。','dispatch'),
 s('pause-2','production-off',2,'暂停后续生产，保留已付款的增援。'),
 s('wait-2','apply',2,'点击应用，等待第二个载体落地。','landing'),
 s('landing-2','landing',2,'点击增援落点，直到士兵真实入队。'),
 s('boss-2','boss',2,'点击本关敌军，继续自动交战。'),
 s('loot-2','loot',2,'点击散件标记，拾取本关装备。'),
 s('card-2','card',2,'点击奖励卡，领取基础兵空投补给。'),
 s('free-landing-2','landing',2,'点击奖励增援落点，接应免费补给。'),
 s('rally-2','rally',2,'点击集结点，守到本关结束。'),
 s('detail-2','detail',2,'点击新散件，查看它的属性。'),
 s('equip-2','equip',2,'点击装备，穿上本关散件。'),
 s('system','system',2,'购买本线攻防系统，强化部队。'),
 s('supply-round-2','supply-round',2,'点击前往补给，保留本轮剩余资源。'),
 s('front-3','front',2,'返回前线，挑战第三关首领。'),
 s('boss-3','boss',3,'击败第三关首领，取得散件和旗舰模块。'),
 s('loot-3','loot',3,'点击战利品，靠近拾取装备。'),
 s('card-3','card',3,'点击奖励卡，领取本关增援。'),
 s('free-landing-3','landing',3,'点击奖励增援落点，把补给接入小队。'),
 s('rally-3','rally',3,'点击集结点，完成本关战斗。'),
 s('detail-3','detail',3,'点击散件；模块要在撤离后安装。'),
 s('equip-3','equip',3,'在关间穿上散件，再带模块撤离。'),
 s('extract','extract',3,'点击撤离，把装备带回旗舰。'),
 ];}
export const GUIDED_FAMILY={terran:'marine',zerg:'zergling',protoss:'zealot'} as const;
export const GUIDED_LINE={terran:'barracks',zerg:'zerg.basic',protoss:'gateway'} as const;
export const GUIDED_ELITE={terran:'marine.1',zerg:'zergling.1',protoss:'zealot.1'} as const;
export const SHORT_TUTORIAL_RESULTS:Partial<Record<GuidedStepKind,string>>={
 worker:'工人已获救。',ling:'跳虫已消灭。',
 drone:'工蜂已击败。',
 landing:'增援已入队。',boss:'精英已消灭。',
 loot:'装备已入包。',
 build:'设施已建成。',apply:'生产安排已保存。',
 supply:'补给已加入小队。',repair:'生命已恢复。',
 equip:'装备已生效。'
};

/** Approved short course: native confirmations stay real clicks, explanations do not repeat. */
export function shortTutorialScript(race:Race):GuidedStep[]{return [
 s('rescue-worker','worker',1,({terran:'移动到虫卵旁，小队会自动攻击，救出这名SCV。',zerg:'移动到虫卵旁，小队会自动攻击，救出这只工蜂。',protoss:'移动到虫卵旁，小队会自动攻击，救出这个探机。'})[race]),
 s('defeat-ling','ling',1,'移动到跳虫旁，小队会自动攻击附近敌人。'),
 s('defeat-drone','drone',1,'移动并击败敌方工蜂，取得它携带的资源。'),
 s('collect-resources','resources',1,'靠近收集矿物和瓦斯，它们用于建设、生产和补给。'),
 s('development','build',1,'扩建设施、研究科技，强化本局部队。先留够训练矿气，再选购。'),
 s('facilities','apply',1,'设施调整可安排生产兵种。基础兵已选好，点击应用确认。'),
 {...s('supply-page','supply-round',1,'战备卡消耗矿气，直接补充部队。购买高亮的基础兵补给。'),group:'supplies'},
 {...s('purchase-card','supply',1,'战备卡可直接补充部队，也会消耗矿气。购买高亮的基础兵补给。'),group:'supplies'},
 s('depart','front',1,'进入下一段，十秒后支付训练费用并准备增援。','dispatch'),
 s('receive','landing',2,'前往高亮落点，守护载体，直到增援士兵入队。'),
 s('elite','boss',2,'前往目标位置，消灭敌方精英。'),
 s('collect-equipment','loot',2,'靠近拾取战利品，再进行关间休整。'),
 s('recover','repair',2,'先在休整中修复受伤部队，费用按当前缺失生命计算。'),
 {...s('inspect-attribute','detail',2,'这件散件可在关间更换。查看后，点击装备穿上。'),group:'attribute'},
 {...s('wear-attribute','equip',2,'这件散件可在关间更换。查看后，点击装备穿上。'),group:'attribute'},
 s('leave','extract',2,'另一件是旗舰模块，撤离后才能安装。现在把它带回旗舰。'),
 ];}
