import type {Race} from './races';
import type {TutorialBeat} from '../simulation/tutorial/runtime';
export const TUTORIAL_ADVISORS:Record<Race,{name:string;portrait:string;lines:Record<TutorialBeat,string>}>= {
 terran:{name:'副官',portrait:'adjutant',lines:{invite:'指挥官，战场链路已接通。需要我协助指挥吗？',move:'向标记处移动。进入射程后，小队会自动开火。',drone:'发现敌方工蜂。带队接近，击毁目标。',resources:'矿物和瓦斯已散落。靠近，把资源收回来。',rescue:'空投已着陆。清除落点附近的敌军，护住增援。',operations:'先看生产安排。买补给前，给下一批援兵留够矿气。',identify:'装备已入包，关间可以整备。',equip:'打开本局背包，把这件散件装进亮起的槽位。',boss:'首领已清除。靠近战利品，把装备带上。',extract:'这个模块要回旗舰安装。准备好后，选择撤离。',flagship:'找到刚带回的模块，将它装上旗舰。'}},
 zerg:{name:'虫后',portrait:'queen',lines:{invite:'虫群已就位。需要我引导它们行动吗？',move:'让虫群向标记处前进。靠近敌人，它们就会攻击。',drone:'那只工蜂属于敌群。接近它，消灭它。',resources:'靠近那些资源。虫群需要矿物和瓦斯。',rescue:'援兵抵达了。扫清周围的敌人，让它们归队。',operations:'查看孵化安排。留下下一批虫群所需的资源，再选补给。',identify:'装备已入包，关间可以整备。',equip:'打开背包。把刚取得的散件装上，强化虫群。',boss:'首领倒下了。让虫群靠近，收回战利品。',extract:'把模块带回旗舰。准备好就撤离。',flagship:'找到带回的模块，把它装进旗舰的对应槽位。'}},
 protoss:{name:'执行官',portrait:'executor',lines:{invite:'通讯已接通。需要我协助你指挥这支部队吗？',move:'率队前往标记处。战士们会自行迎敌。',drone:'敌方工蜂就在前方。率队截击。',resources:'收集落点处的矿物与瓦斯，为增援作准备。',rescue:'折跃信号已锁定。守住落点，接应我们的战士。',operations:'查看折跃部队的生产安排，权衡增援和眼前的补给。',identify:'装备已入包，关间可以整备。',equip:'打开背包，将这件散件装入对应槽位。',boss:'首领已被击败。率队收取它留下的装备。',extract:'模块需要在旗舰上整备。准备妥当后，选择撤离。',flagship:'选中刚带回的模块，完成旗舰配装。'}}
};
export const QUEEN_TUTORIAL_SOUND='audio.sc2.source.eef81136d1b7b8bf42cc522c';
