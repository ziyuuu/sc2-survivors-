export type TalentLine='resources'|'soldiers'|'army'|'micro';
export interface TalentNode {id:string;line:TalentLine;tier:number;column:number;name:string;max:number;cost:number;description:string;requires?:string[];minRequires?:Record<string,number>}
const n=(line:TalentLine,tier:number,column:number,id:string,name:string,max:number,cost:number,description:string,requires:string[]=[],minRequires?:Record<string,number>):TalentNode=>({line,tier,column,id,name,max,cost,description,requires,minRequires});

/** Permanent Survivors tuning. Total price: 258 resource points. */
export const TALENTS:readonly TalentNode[]=[
 n('resources',1,1,'scv_savior','SCV 救星',2,1,'每次救出虫卵，额外获得 1 名 SCV／级'),
 n('resources',2,0,'mining_master','采集大师',3,1,'自动矿气收入 +15%／级',['scv_savior']),
 n('resources',2,1,'reroll_fan','刷新爱好者',3,1,'刷新费 −20 矿／级，最低 10 矿',['scv_savior']),
 n('resources',2,2,'frugal_build','节约建材',3,1,'建筑价 −15%／级',['scv_savior']),
 n('resources',3,0,'recycle','高效回收',3,1,'实际拾取矿气 +25%／级',['mining_master']),
 n('resources',3,1,'window_shop','我就看看',3,1,'每次关间 +1 次免费刷新／级',['reroll_fan']),
 n('resources',3,2,'free_house','这是谁的房子',3,1,'每购建筑 +20%／级概率免本次费用',['frugal_build']),
 n('resources',4,0,'battlefield_cleaner','清扫战场',2,3,'资源拾取半径 ×2／级',['recycle']),
 n('resources',4,1,'free_purchase','这次消费免单',2,3,'随机轮 +1 免费购买名额／级',['window_shop']),
 n('resources',4,2,'double_build','双倍建造',2,3,'购建筑 +20%／级概率付双份价建两座',['free_house']),
 n('resources',5,0,'bonus_income','奖金增加',3,1,'通关矿气奖 +10%／级',['battlefield_cleaner']),
 n('resources',5,1,'permanent_discount','永久折扣',3,1,'本局购买价 −10%／级',['free_purchase']),
 n('resources',5,2,'instant_tech','一次完工',3,1,'新建筑 +33%／级概率完成已解锁科技',['double_build']),
 n('resources',6,0,'rarity_master','出金大师',2,3,'未来橙色 +0.5%、紫色 +1%／级'),
 n('resources',6,2,'elite_classroom','精英教室',2,3,'兵营乘员 +15%／级概率成为可用紫色精英',['instant_tech']),
 n('resources',7,1,'hero_support','英雄支援',1,5,'开局自选一位 Rank 1 英雄',['rarity_master','elite_classroom']),

 n('soldiers',1,1,'advanced_arms','高级武装',3,1,'友军伤害、生命、护甲、移速、攻速和治疗 +5%／级'),
 n('soldiers',2,0,'weapon_upgrade','武器升级',3,1,'攻击伤害 +5%／级',['advanced_arms']),
 n('soldiers',2,1,'armor_upgrade','护甲提升',3,1,'护甲后受伤再减 4%／级',['advanced_arms']),
 n('soldiers',2,2,'light_armor','轻量化护甲',3,1,'移速 +5%／级',['advanced_arms']),
 n('soldiers',3,0,'headshot','爆头',3,1,'普通攻击 +5%／级暴击率，暴击伤害 1.5 倍',['weapon_upgrade']),
 n('soldiers',3,1,'bio_shield','生物护甲',3,1,'生物护盾上限为生命 +10%／级',['armor_upgrade']),
 n('soldiers',3,2,'veteran_dodge','经验老兵',3,1,'普通攻击 +3%／级闪避率',['light_armor']),
 n('soldiers',4,0,'rapid_attack','快速攻击',2,3,'攻速 +8%／级',['headshot']),
 n('soldiers',4,1,'lovers_charm','爱人的护符',2,3,'普通兵致死时 +33%／级概率保留 1 HP',['bio_shield']),
 n('soldiers',4,2,'team_share','整备队伍',2,3,'同类队员分担 20%／40% 伤害',['veteran_dodge']),
 n('soldiers',5,0,'big_firepower','大火力',3,1,'伤害再 +10%／级',['rapid_attack']),
 n('soldiers',5,1,'super_meat','超级肉',3,1,'生命 +15%／级',['lovers_charm']),
 n('soldiers',5,2,'marathon','长跑冠军',3,1,'移速再 +5%／级',['team_share']),
 n('soldiers',6,0,'elite_training','精英培训',2,3,'普通兵军衔上限提高至 6／7',['big_firepower']),
 n('soldiers',6,1,'last_stand','死战不退',2,3,'普通兵本关首次致死后以 1 HP 继续战斗 8／15 秒',['super_meat']),
 n('soldiers',7,1,'star_warrior','星际战士',1,5,'Rank 5 普通兵收集七名同类增援，进化战术精英 I–V',['elite_training','last_stand']),

 n('army',1,1,'skilled_troop','熟练部队',3,1,'救援乘员 3%／6%／10% 概率多升一级'),
 n('army',2,0,'experience_summary','经验总结',3,1,'合格击杀 +1%／级概率升军衔',['skilled_troop']),
 n('army',2,1,'reinforcement','补充成员',3,1,'击杀 +1%／级概率召来免费普通救援仓',['skilled_troop']),
 n('army',2,2,'orderly_army','规整部队',3,1,'Rank 2+ 普通兵致死 +1%／级概率降级存活',['skilled_troop']),
 n('army',3,0,'battle_review','战例复盘',3,1,'击杀晋升概率再 +1%／级',['experience_summary']),
 n('army',3,1,'conscript_network','征召网络',3,1,'免费救援乘员生命 +10%／级',['reinforcement']),
 n('army',3,2,'honor_archive','荣誉档案',3,1,'规整触发后生命再恢复 +10%／级',['orderly_army']),
 n('army',4,0,'teach_experience','传授经验',2,3,'同类精英存活时晋升概率额外 +3%／级',['battle_review']),
 n('army',4,1,'self_growth','自我成长',2,3,'紫色精英每 360／240 秒自动升一级',['conscript_network']),
 n('army',4,2,'find_elites','寻找精英',2,3,'里程碑随机轮保证 1／2 张可购买紫卡',['conscript_network']),
 n('army',5,0,'advantage_army','优势部队',3,1,'原有克制属性加成再 +10%／级',['teach_experience']),
 n('army',5,1,'proliferate','增殖部队',3,1,'击杀 +0.5%／级概率召来 Rank 5 临时步兵',['self_growth']),
 n('army',5,2,'tank_support','坦克支援',3,1,'定期提供坦克火力与医疗艇治疗',['find_elites']),
 n('army',6,0,'elite_scout','精英侦察',2,3,'救出 SCV +5%／级概率额外获得可用紫色精英',['find_elites']),
 n('army',6,2,'mercenary','雇佣兵先生',2,3,'每 240／120 秒召唤 Rank 5 临时紫色精英',[],{advantage_army:1,tank_support:1}),
 n('army',7,1,'expanded_squad','扩充队伍',1,5,'每兵种普通席位 5→7；英雄额外三席不变'),

 n('micro',1,1,'tidy_squad','队伍整齐',3,1,'落后者追赶加速 +10%／20%／30%'),
 n('micro',2,1,'range_master','高手射程',3,3,'武器射程 +4%／级',['tidy_squad']),
 n('micro',3,1,'skill_recovery','技能回复',3,3,'主动技能冷却 −8%／级',['range_master']),
 n('micro',4,1,'airlift','空投玩家',2,6,'队伍空运冷却 240／120 秒',['skill_recovery']),
 n('micro',5,1,'quick_siege','快速架炮',3,3,'坦克变形时间减少 33%／级，最少 0.25 秒',['airlift']),
 n('micro',6,1,'stutter_king','走 A 之王',2,6,'移动瞄准速度 ×1.5／2；移动开火率 50%／100%',['quick_siege']),
 n('micro',7,1,'apm_master','这是 APM 么？',1,10,'普通武器攻击发射两枚各造成当前单发伤害的弹道',['stutter_king'])
];
export const TALENT_BY_ID=new Map(TALENTS.map(node=>[node.id,node]));
export const TALENT_LINES:readonly {id:TalentLine;name:string}[]=[{id:'resources',name:'资源管理'},{id:'soldiers',name:'强化士兵'},{id:'army',name:'军队管控'},{id:'micro',name:'微操大师'}];
export const TOTAL_TALENT_COST=TALENTS.reduce((sum,node)=>sum+node.max*node.cost,0);
