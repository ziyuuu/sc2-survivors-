# 战斗特效来源及身份对应 · 2026-10-12

本表由 `tools/document-combat-effects.mts` 从已解析的 Actor 引用、原始文件散列与正式身份数据生成。源版本为工程锁定的 SC2 5.0.16.97563；自定义精英与英雄仍采用本游戏已批准机制。完整可读来源链保存在 `reports/local/combat-effects-20261012/source-map.json`；可版本控制的来源、身份和适配器散列在 `reports/qa/combat-effects-sources-20261012.json`。

覆盖 30 普通、90 精英、18 英雄；43 武器／支持分支，83 原始模型定义，216 个粒子发射器、43 条光带、4 个投影定义。提取读取 312 个 M3／DDS 源文件；全部源文件只读并逐一核对散列。

## 武器与效果层

各层读取原始动画曲线、颜色、透明度、纹理、混合方式、发射率与粒子运动。瞬时武器在实际命中回执播放冲击；在途武器读取真实 `WeaponFlight` 位置；持续光束、治疗和区域从现有状态重建。轨迹、命中时刻、伤害及范围仍由模拟决定。

| 分支／兵种 | 武器／形态 | 发射挂点 | 模型分层 | 结束方式 |
| --- | --- | --- | --- | --- |
| marine · Marine | GaussRifle | Original Weapon attachment with model fallback | launch: MarineAttackLaunch；impact: MarineAttackImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| marauder · Marauder | PunisherGrenades | Left on odd native shot sequence；Right on even native shot sequence | launch: MarauderAttackLaunch；flight: PunisherGrenadesLMWeapon；impact: MarauderBaseAttackImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| reaper · Reaper | P38ScytheGuassPistol | Right；Left | launch: ReaperAttackLaunch；impact: ReaperAttackImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| hellion · Hellion | InfernalFlameThrower | Original Weapon attachment with model fallback | beam: HellionAttackBeam；impact: HellionAttackDamageReaction | 原状态结束；源 Birth/Stand/Death 与粒子寿命 |
| hellbat · Hellion | HellionTank / hellbat | Original Weapon attachment with model fallback | launch: HellionTankAttackLaunch；impact: HellionTankAttackFireAddition | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| tank · Siege Tank | 90mmCannons | Original Weapon attachment with model fallback | launch: SiegeTankAttackLaunch；impact: SiegeTankAttackImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| tank-siege · Siege Tank | CrucioShockCannon / siege | Original Weapon attachment with model fallback | launch: SiegeTankSiegedAttackLaunch；impact: SiegeTankSiegedAttackImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| thor-ground · Thor | ThorsHammer | 05；07 | launch: ThorHandGunAttackLaunch；impact: ThorHandGunAttackImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| thor-air · Thor | JavelinMissileLaunchers | 15；16；17；18 | launch: ThorAAAttackLaunch；flight: ThorAAWeapon；impact: ThorAAAttackImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| thor-high-impact · Thor | LanceMissileLaunchers / thor_high_impact | 01/03 on odd sequence；02/04 on even sequence | launch: ThorAAAttackLaunchLance；impact: ThorAAAttackImpactLance | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| viking · Viking | LanzerTorpedoes | 10；14 | launch: VikingFighterAttackLaunch；flight: VikingFighterWeapon；impact: VikingFighterAttackImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| viking-assault · Viking | TwinGatlingCannons / viking_assault | Left；Right | launch: VikingAssaultAttackLaunch；impact: VikingAssaultAttackImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| banshee · Banshee | BacklashRockets | Right；Left | flight: BacklashRocketsLMWeapon；impact: BansheeAttackImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| medivac · Medivac | 支持 | Original Weapon attachment with model fallback | beam: MedivacHealBeam；impact: MedicHealModel | 实际恢复关系结束；瞬时输血反馈自然消散 |
| science-vessel · Science Vessel | 支持 | Original Weapon attachment with model fallback | Retain the approved recipient nano-mist; historical Science Vessel source gate remains open. | 实际恢复关系结束；瞬时输血反馈自然消散 |
| zergling · Zergling | Claws | Original Weapon attachment with model fallback | 原身体攻击动作及真实受击表面 | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| baneling · Baneling | VolatileBurst | Original Weapon attachment with model fallback | impact: BanelingDeath | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| roach · Roach | AcidSaliva | Original Weapon attachment with model fallback | flight: AcidSalivaWeapon；impact: RoachMissileImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| ravager · Ravager | RavagerWeapon | Original Weapon attachment with model fallback | flight: RavagerWeaponMissile；impact: RavagerWeaponImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| ravager-bile · Ravager | CorrosiveBile | Original Weapon attachment with model fallback | flight: RavagerCorrosiveBileMissile；impact: RavagerCorrosiveBileImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| hydralisk · Hydralisk | NeedleSpines | Original Weapon attachment with model fallback | flight: NeedleSpinesWeapon；impact: HydraliskAttackImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| queen-melee · Queen | Talons | Original Weapon attachment with model fallback | launch: QueenAttackLaunch | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| queen-ground · Queen | TalonsMissile | Original Weapon attachment with model fallback | flight: TalonsMissileWeapon；impact: QueenMissileImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| queen-air · Queen | AcidSpines | Original Weapon attachment with model fallback | flight: AcidSpinesWeapon；impact: QueenMissileImpact；launch: AcidSpinesAttackLaunch | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| queen-heal · Queen | Transfusion | Original Weapon attachment with model fallback | impact: SquibTransfusion | 实际恢复关系结束；瞬时输血反馈自然消散 |
| lurker · Lurker | LurkerMP / lurker_burrowed | Original Weapon attachment with model fallback | impact: LurkerMPAttackSpike, LurkerAttackSpikeEx2 | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| mutalisk · Mutalisk | GlaiveWurm | Original Weapon attachment with model fallback | flight: GlaiveWurmWeapon；impact: MutaliskAttackSegment1Impact, MutaliskAttackSegment2Impact, MutaliskAttackSegment3Impact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| corruptor · Corruptor | ParasiteSpore | Original Weapon attachment with model fallback | launch: CorruptorAttackLaunch；flight: ParasiteSporeWeapon；impact: CorruptorAttackImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| ultralisk · Ultralisk | KaiserBlades | Original Weapon attachment with model fallback | body: Ultralisk | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| zealot · Zealot | PsiBlades | Original Weapon attachment with model fallback | body: Zealot | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| adept · Adept | Adept | Original Weapon attachment with model fallback | flight: AdeptWeapon；impact: AdeptImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| stalker · Stalker | ParticleDisruptors | Original Weapon attachment with model fallback | flight: StalkerWeapon；impact: StalkerAttackImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| sentry · Sentry | DisruptionBeam | Original Weapon attachment with model fallback | beam: SentryAttackBeam | 原状态结束；源 Birth/Stand/Death 与粒子寿命 |
| guardian · Sentry | GuardianShield | Original Weapon attachment with model fallback | field: GuardianShield；impact: GuardianShieldImpact | 原状态结束；源 Birth/Stand/Death 与粒子寿命 |
| immortal · Immortal | PhaseDisruptors | Original Weapon attachment with model fallback | body: Immortal；impact: ImmortalAttackImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| colossus · Colossus | ThermalLances | Original Weapon attachment with model fallback | beam: ColossusAttackBeam；impact: ColossusAttackBeamImpact | 原状态结束；源 Birth/Stand/Death 与粒子寿命 |
| high-templar · High Templar | HighTemplarWeapon | Original Weapon attachment with model fallback | flight: HighTemplarWeapon；impact: HighTemplarAttackImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| storm · High Templar | PsiStorm | Original Weapon attachment with model fallback | field: HighTemplarPsiStormModel；impact: HighTemplarPsiStormImpact | 原状态结束；源 Birth/Stand/Death 与粒子寿命 |
| phoenix · Phoenix | IonCannons | Weapon 01；Weapon 03 | flight: IonCannonsWeapon；impact: PhoenixAirAttackImpact；reactionFlesh: BloodTargetImpact | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| void-ray · Void Ray | VoidRaySwarm | Original Weapon attachment with model fallback | beam: VoidRayAttackBeam；impact: VoidRayCenterBeam | 原状态结束；源 Birth/Stand/Death 与粒子寿命 |
| carrier · Carrier | InterceptorLaunch | Original Weapon attachment with model fallback | 原身体攻击动作及真实受击表面 | 真实命中或原发射回执后，按源动画／粒子寿命消散 |
| interceptor · Carrier | InterceptorBeam | Original Weapon attachment with model fallback | beam: InterceptorAttackBeam；impact: InterceptorAttackImpact | 原状态结束；源 Birth/Stand/Death 与粒子寿命 |
| shield-hit · 目标护盾 | 支持 | Original Weapon attachment with model fallback | impact: ProtossShieldDamage, ProtossShieldRipple；area: ProtossShieldFull | 真实命中或原发射回执后，按源动画／粒子寿命消散 |

## 普通身份

| 身份 | 名称 | 基础分支 |
| --- | --- | --- |
| marine | Marine | marine |
| marauder | Marauder | marauder |
| reaper | Reaper | reaper |
| hellion | Hellion | hellion；hellbat |
| tank | Siege Tank | tank；tank-siege |
| thor | Thor | thor-ground；thor-air；thor-high-impact |
| viking | Viking | viking；viking-assault |
| banshee | Banshee | banshee |
| medivac | Medivac | medivac |
| science_vessel | Science Vessel | science-vessel |
| zergling | Zergling | zergling |
| baneling | Baneling | baneling |
| roach | Roach | roach |
| ravager | Ravager | ravager；ravager-bile |
| hydralisk | Hydralisk | hydralisk |
| queen | Queen | queen-melee；queen-ground；queen-air；queen-heal |
| lurker | Lurker | lurker |
| mutalisk | Mutalisk | mutalisk |
| corruptor | Corruptor | corruptor |
| ultralisk | Ultralisk | ultralisk |
| zealot | Zealot | zealot |
| adept | Adept | adept |
| stalker | Stalker | stalker |
| sentry | Sentry | sentry；guardian |
| immortal | Immortal | immortal |
| colossus | Colossus | colossus |
| high_templar | High Templar | high-templar；storm |
| phoenix | Phoenix | phoenix |
| void_ray | Void Ray | void-ray |
| carrier | Carrier | carrier |

## 精英身份和既有特殊机制

基础枪口、弹体、光束与冲击由对应原始分支负责；已有特殊机制层保留。原身体皮肤不被替换，源效果不按精英统一改色。附加连射、扇形、地刺、胆汁、光束强度和第三次挥砍读取现有精英状态。下列机制描述来自正式精英规则表，不能把列出机制视为该机制已完成画面验收；实际触发记录见验证报告及画廊。

| 身份 | 名称 | 基础分支 | 既有特殊机制 |
| --- | --- | --- | --- |
| marine.1 | 金属风暴 | marine | 持续开火在5秒内预热至4倍攻速，满速压制10秒后停火排热2秒。轻甲伤害×1.6，移动速度略降。 |
| marine.2 | 精英杀手 | marine | 蓝色穿甲弹对精英造成3倍伤害、对Boss造成5倍伤害。I–V级闪避直接普通攻击的概率为12%／16%／20%／24%／28%。 |
| marine.3 | 战场指挥官 | marine | 全队普通与精英陆战队员的生命、护盾、武器伤害、攻速、移速和护甲提高20%；同类指挥加成只生效一次。 |
| marauder.1 | 震撼弹专家 | marauder | 重型震撼弹在接触区压低敌方攻击速度、移动与攻击伤害。 三项独立状态，同来源刷新；Boss控制强度减半；攻击伤害降低不改固定技能/百分比伤害，不能永久归零。 |
| marauder.2 | 破甲精英 | marauder | 范围穿甲榴弹削弱敌人护甲，为全队打开重甲目标。 百分比作用于正护甲，不把护甲压成负数；来源同类取强值；原生盾甲按同样比例，生命/盾减伤分开。 |
| marauder.3 | 拒绝者 | marauder | 每周期三枚小范围榴弹组成弹幕，命中有机会推开冲锋者。 一次周期最多推同敌一次；按合法路径推，墙边缩短；Boss/领主免位移改短减速；无递归反弹。 |
| hellion.1 | 长炎 | hellion；hellbat | 火焰射程提高至4倍，沿窄幅直线灼烧地面目标；对轻甲造成1.8倍伤害。恶蝠形态同样延长火焰攻击距离。 |
| hellion.2 | 地狱骑士 | hellion；hellbat | 火焰半径为普通恶火／恶蝠对应形态的2/3，覆盖前方150°扇面；对轻甲造成1.8倍伤害。恶蝠形态保留扇面喷火。 |
| hellion.3 | 布雷车 | hellion；hellbat | 每12秒部署2枚大型追踪雷，最多保留8枚；发现6范围内地面敌人后出土并以6速度追击。I级爆炸1200、半径4.2，随后两次每秒180残火；随军衔强化。 |
| tank.1 | 豹石 | tank；tank-siege | 保持机动时仍使用攻城炮，保留原生攻城弹与溅射；不能切换至驻扎形态，仍受攻城炮最小射程限制。 |
| tank.2 | 虎式 | tank；tank-siege | 驻扎后攻击速度和炮弹伤害均提高至2倍，射程提高至3倍；移动形态保留机动，但不发射攻城炮。 |
| tank.3 | 毁灭者 | tank；tank-siege | 驻扎炮击的爆炸面积扩大至5倍，原有各档溅射伤害保留；爆点1秒后造成一次50%炮击伤害的残火，同一炮手的残火对同一目标每秒最多一次。 |
| medivac.1 | 战场女武神 | medivac | 治疗一个伤员；8范围永久战斗友军生命提高35%，额外获得5护甲。同类指挥加成只生效一次，进出范围保持生命比例。 |
| medivac.2 | 精英救护 | medivac | 同时用医疗束治疗最多5名伤员，优先照顾生命比例最低者。治疗生物单位为全效，机械单位为三分之一；按实际恢复消耗能量。 |
| medivac.3 | 微光护盾 | medivac | 治疗一个伤员；伤员最近2秒开火或受伤时，每实际恢复1生命额外生成1.2有限屏障，最高为其最大生命50%，持续6秒。 |
| reaper.1 | 午夜死神 | reaper | 每次攻击连续射出6发高速子弹，对轻甲造成1.8倍伤害；子弹逐发命中。 |
| thor.1 | 雷霆支点 | thor-ground；thor-air；thor-high-impact | 每第3轮对地攻击引发4范围震击，额外造成2倍本轮伤害并减速40%持续2秒，Boss减速减半。6范围永久机械友军额外获得4护甲。 |
| viking.1 | 苍穹猎鹰 | viking；viking-assault | 首次对空攻击追加一对导弹，合计额外造成150%单发伤害；连续攻击同一空军每轮增加35%伤害，最多5层，换目标清除层数。 |
| banshee.1 | 报丧女妖 | banshee | 8范围内可见敌人的正护甲降低40%，已有减伤效果相对降低25%；不会消除免疫或有限屏障。 |
| science_vessel.1 | 铁幕研究员 | science-vessel | 以绿色纳米迷雾修复最多3名伤员。每实际恢复1生命额外生成1.5有限屏障，最高为伤员最大生命60%，持续7秒；机械单位全效、生物单位三分之一。 |
| zergling.1 | 裂爪狂潮 | zergling | 双身体交替撕咬；连续出手逐层叠加狂潮，打出远超普通虫群的近战密度。 两个真实身体共享狂潮层数，各自武器周期；不复制第三身体；幸存再生仍按900步。 |
| baneling.1 | 灾厄酸核 | baneling | 自爆伤害三倍、酸爆覆盖扩展，爆后存活但停顿五秒。 仅玩家爆虫存活；停顿不能通过升级/读档跳过；酸爆一次，无法对空，不把爆炸当免费技能连发。 |
| roach.1 | 深壳堡垒 | roach | 血量越低甲壳越硬，濒危时自动钻地短时修复后出土。 自动钻地为明确新变体行为；受侦测仍可被击杀，钻地不攻击；不取消指令或无限躲避Boss。 |
| ravager.1 | 连囊炮手 | ravager；ravager-bile | 胆汁技能一次投出三枚，沿同一目标区域分段砸落。 三枚独立预警/落点，重叠允许三次实际伤害；仍需原胆汁技能解锁，不把普攻重复当技能。 |
| hydralisk.1 | 千针风暴 | hydralisk | 每周期五根实体骨针形成窄锥，主目标承受全部实际命中骨针。 单周期最多3.5倍主伤；五根针不能各触发一轮五针，地空同原合法层。 |
| lurker.1 | 三脊穿心 | lurker | 埋地下每周期沿三条扇向释放真实刺脊，中央敌人可被三线交会命中。 需埋地；每条独立交集，未在交会处只中一/两条；不以动画给三倍虚假全场伤害。 |
| queen.1 | 母巢女王 | queen-melee；queen-ground；queen-air；queen-heal | 护育光环提高生物战斗友军生命和再生，自己以厚壳稳住后方。 再生只恢复HP；原45秒注卵与同舱一次保留，不把战斗光环兑换额外免费经济。 半径9，生命＋45%、生命护甲＋6、每秒恢复最大生命2%。 |
| mutalisk.1 | 六翼回旋 | mutalisk | 一枚刃虫最多六次反弹，后几跳保持高强度清空散群。 同一敌人最多一次命中；有六个合法邻敌才兑现全部，不把六跳全算单体。 |
| corruptor.1 | 蚀空锁喉 | corruptor | 对同一空中目标持续喷酸越久越强，最终形成重甲腐蚀锁。 换目标重置充能；无法攻击地面，不能把锁定爆发复制给地面Boss。 |
| ultralisk.1 | 暴君镰刃 | ultralisk | 宽镰每第三击释放三倍撕裂，切断轻甲前排。 第三击替换而非额外三击；仍近战到位，不能通过墙/空军；大扇形只命中真实覆盖。 |
| zealot.1 | 誓刃狂徒 | zealot | 双刃连击逐层点燃战意，满层后每第三击扩大为灵能斩面。 两刃仍是一个武器周期；伤害只来自实在斩面，战意两秒无攻击清除；不新增对空。 |
| adept.1 | 双相战刃 | adept | 同一周期发出实体刃与延迟相位刃，第二刃击中原落点才伤害。 回响用冻结落点，不凭残像必中；每个原周期一个回响、不递归趣味卡；无法对空。 |
| stalker.1 | 虚空连射 | stalker | 持续锁定同一敌人使晶体连射成型，第四周期发射三连主弹。 三弹各真实飞行，共3.6倍该周期；切换不清累计周期但不刷新冷却，地空合法层保持。 |
| sentry.1 | 光穹织者 | sentry；guardian | 守护者护盾升级为稳定织盾阵，圈内原生盾持续修复。 实际缺原生盾才恢复，消耗原能量；无原生盾不虚构治疗；与普通守护盾同通道取强值。 新增常驻半径9：生命＋20%、原生盾＋40%、生命护甲＋3、盾护甲＋5。 |
| immortal.1 | 破城判官 | immortal | 反甲双炮越打同一重甲越强，屏障耗尽时下一炮为重判。 重判只一次且不与锁定再多层递归；Boss取合法重甲属性，不把建筑/巨型当重甲。 |
| colossus.1 | 焚天双束 | colossus | 双束沿地面持续扫灼，第二秒后把同一目标灼成高热。 高热逐目标计时、离束重置；同源火区不叠，不解除巨像可被对空攻击的弱点。 |
| high_templar.1 | 风暴执政 | high-templar；storm | 灵能风暴覆盖加大，同一风暴脉冲更密、更强。 总伤只提高2.5倍，更密脉冲分拆该预算，不再乘2；保留能量、前置与合法目标。 |
| phoenix.1 | 离子六翼 | phoenix | 空战每周期发射六枚离子弹，以高速压制轻型空军。 普通为双弹，六枚是三倍周期弹次；没有地面普通武器，引力仍沿合法地面目标。 |
| void_ray.1 | 棱光处刑舰 | void-ray | 同目标持续束流五秒后进入五倍棱镜处刑。 转火/两秒无合法束流重置；不能把新五倍再乘旧模板同类充能，直接替换。 |
| carrier.1 | 蜂群指挥舰 | carrier | 八架真实截击机围攻，连续锁定后进入蜂群超载。 每架独立所属身体；只存活出勤子机计火力；数量与攻速四倍峰值，不给母舰假普攻。 |
| viking.2 | 钢铁落锤 | viking；viking-assault | 真实降落完成后造成4范围冲击，I级伤害1600、冷却12秒；地面形态武器伤害翻倍，额外获得5护甲。受阻时等待落点腾出。 |
| viking.3 | 双相王牌 | viking；viking-assault | 真实形态转换完成后强化下10轮攻击至2.5倍，并获得相当于最大生命35%的6秒有限屏障；共用14秒触发冷却。 |
| ravager.2 | 破城酸星 | ravager；ravager-bile | 胆汁变为超重酸星，对重甲/建筑增伤并短时降低正护甲。 胆汁冷却不缩；体积与延迟保留，建筑/重甲倍率取一次；不是打Boss生命百分比。 |
| ravager.3 | 腐蚀雨幕 | ravager；ravager-bile | 胆汁落点形成六秒酸雨，侵蚀并迟滞地面密集敌群。 本机雨区重叠取强值，敌人离区即停止收益；普攻对空能力不改变雨区只打地面的边界。 半径8持续范围：敌正生命/盾护甲－45%，已有百分比减伤相对降低25%。 |
| high_templar.2 | 反馈先知 | high-templar；storm | 优先抽取消耗敌方能量并转成灵能伤害，额外给高危目标固定反馈。 无能量敌人只受固定包；Boss不凭身份虚构能量，反馈总额冻结消耗一次。 反馈实际命中后，受到武器伤害＋25%，持续6秒。 |
| high_templar.3 | 静电织网 | high-templar；storm | 每次风暴形成静电织网，圈内敌人攻速降低，友方能量缓慢回流。 不叠同源织网，Boss攻速减半；能量按各自上限，只给既有能量战斗身体。 新增半径8持续范围：正生命/盾护甲－45%，已有百分比减伤相对降低25%。 |
| reaper.2 | 大枪管 | reaper | 进入战斗后的前10轮攻击强化至3倍伤害，重甲伤害额外×1.5；命中向周围2.6范围溅射50%伤害。脱战2秒重置。 |
| reaper.3 | 孤星猎手 | reaper | 死神家族仅保留这一名永久战士；吸收其余死神与后续送达死神，按军衔和精英身份积累成长。伤害、生命、护甲增长逐渐趋缓，上限分别为基础的4倍、5倍和额外10点护甲。其他兵种与英雄照常保留。 |
| thor.2 | 天罚炮台 | thor-ground；thor-air；thor-high-impact | 对重甲空军造成3倍伤害，命中向3范围其他空军溅射60%；连续锁定同一空中目标3秒后攻速翻倍，换目标或脱战后重新锁定。 |
| thor.3 | 末日过载 | thor-ground；thor-air；thor-high-impact | 持续交战4秒蓄力后进入8秒过载，武器伤害提高至3倍；随后4秒冷却，再次循环。换目标不会跳过蓄力。 |
| banshee.2 | 瘟疫女妖 | banshee | 7范围持续污染敌方战斗单位，每秒按进入范围时的最大生命造成3%／3.5%／4%／4.5%／5%伤害；敌精英减半，Boss与领主仅承受五分之一。 |
| banshee.3 | 振奋女妖 | banshee | 脱战2秒后为下次交战蓄能，8秒蓄满；I级满蓄能造成5范围2600伤害，随军衔强化。脱战期间永久战斗友军移动速度提高30%。 |
| science_vessel.2 | 辐照工程师 | science-vessel | 纳米迷雾修复最多2名伤员；每10秒对8范围生物敌人施加6秒辐照，I级每秒对3范围生物敌人造成380伤害，随军衔强化，辐照跟随宿主。 |
| science_vessel.3 | 磁脉冲主宰 | science-vessel | 纳米迷雾修复最多3名伤员；每14秒释放5范围EMP，I级削去最多2400护盾并抽掉60%当前能量，随军衔强化护盾伤害。敌方攻速降低30%持续4秒，Boss减半；无护盾时不会转为生命伤害。 |
| zergling.2 | 噬甲獠牙 | zergling | 双身体同一周期连续命中后撕裂护甲，第三次啃咬释放处决伤害。 按身体真实周期计数；处决替换该次伤害，非额外四击；Boss可破甲不能秒杀，不打空军。 |
| zergling.3 | 共生血巢 | zergling | 双身体分摊伤害，攻击吸收养分；一体存活维持另一体再生。 分摊不能回环；按有效生命伤吸血，不能吸盾/无敌；900步保留，任一体都死仍丧失名额。 全队跳虫攻击、攻速、生命、原生盾、生命/盾护甲、移动各＋20%；主武器零甲持续输出×1.44。 |
| baneling.2 | 腐土播种者 | baneling | 爆心留下腐土，五秒休眠期间继续侵蚀范围内地面敌军。 腐土逐秒按实在范围敌人结算，同源取强值；Boss允许固定伤害，无永久百分比蒸发。 |
| baneling.3 | 甲壳反应堆 | baneling | 受到攻击积累酸压，爆炸释放储压并把部分威力变成自身再生。 只积累实际承受敌伤，不收无敌阻止量/友伤；储压一次消费，固定上限可被击杀，爆后同样停五秒。 |
| roach.2 | 穿甲酸喉 | roach | 同目标连续酸击逐层软化重甲，第六发喷出高浓酸。 六发循环，转火清酸层；高浓酸替换第六发主伤，不把层数和四倍再无限相乘。 |
| roach.3 | 反噬菌甲 | roach | 受到近战攻击反射腐蚀，攻击命中后再生增强，成为能输出的生体前线。 反伤以实际受伤包为基数，无递归；只反近战敌人，不能让远程或空军无成本受伤。 |
| hydralisk.2 | 裂甲长棘 | hydralisk | 重型骨棘贯穿敌阵，对装甲主目标提高伤害并穿过后排。 首目标全包，后排每敌一次80%；地空贯穿分层，不隔山射击。 |
| hydralisk.3 | 毒囊猎手 | hydralisk | 主击把毒囊植入敌人，连续植入加强缓释毒伤并在敌人死亡时传播。 每来源最多四层；死亡传播只传播剩余一层且不再传播；Boss不传播，固定毒伤仍可用。 每层毒囊附带受到武器伤害＋5%，4层上限＋20%；继发1层仅＋5%。 |
| lurker.2 | 地裂巨刺 | lurker | 每第四周期发出超长巨刺，击穿重甲并掀动地面敌人。 巨刺替换该周期；Boss慢速半效、不能掀飞；需地面连通/视线，无空中伤害。 |
| lurker.3 | 潜巢伏击者 | lurker | 埋地转场更快，第一次伏击前三个周期带高额伤害和护壳。 十二秒触发内置冷却，钻出钻入不无限重开；未埋地依旧不能发刺。 |
| queen.2 | 输血主母 | queen-melee；queen-ground；queen-air；queen-heal | 输血改成多目标连续治疗，救回正在失血的生体阵线。 每个目标实际缺血封顶；消耗原输血能量来源，零能量不空放；机械不可受生物输血。 原输血实际恢复后给予6秒：受到生命治疗＋30%，武器实际生命伤吸血15%，每体每秒吸血最多自身最大生命10%。 |
| queen.3 | 毒巢守卫 | queen-melee；queen-ground；queen-air；queen-heal | 攻击登记巢毒，受伤友军附近的敌人优先被毒刺压制。 优先级不制造新追敌移动指令；Boss控制减半；不把毒刺封锁写成无限眩晕。 半径8持续范围：武器伤害－30%、攻速－35%、移动－45%；Boss各半效。 |
| mutalisk.2 | 绞杀翼群 | mutalisk | 三枚刃虫同时攻击一个目标，反弹削弱但主目标可承受三重绞杀。 三枚各有实际命中，共三倍主包；转火/飞行不能刷弹次，无虚假第四身体。 |
| mutalisk.3 | 血羽迁徙 | mutalisk | 脱战积蓄血羽护壳，进战前三秒高速吸血，随后恢复平常循环。 需要完整储能才最大护壳；进战消耗且不重复叠；吸血只主目标有效生命伤。 来源脱战2秒后，全队生物移速＋30%；入战按真实储能比例给半径8内5名其他友军最多15%生命护障，4秒，团队触发间隔12秒。 |
| corruptor.2 | 空巢铁卫 | corruptor | 护翼光环替附近空中友军承受部分直接敌伤，并靠厚甲支撑空战。 分摊量每秒有自身HP预算，不递归分摊；不是替地面全队无敌，友军真实HP伤先减少才记收益。 新半径9属性场：生命/原生盾＋35%、生命/盾护甲＋6、攻速＋25%；原半径7分担继续。 |
| corruptor.3 | 腐空瘟囊 | corruptor | 击中空军种下腐空囊，宿主死亡时爆炸并给附近空军补一个毒囊。 排除Boss/领主传播；每来源每目标一囊，继发囊不再传播，地面不受伤。 |
| ultralisk.2 | 不灭甲兽 | ultralisk | 满壳承伤积蓄甲盾，跌破生命阈值时消耗盾壳恢复并短暂稳住。 敌人可一次打穿触发阈值；护壳不是复活，冷却保存；不从免伤量储蓄，不永久免疫。 |
| ultralisk.3 | 原始踏碎者 | ultralisk | 短距冲锋结束踩碎地面，随后六秒以双倍攻速追猎重甲。 冲锋沿合法通道、撞墙截断；Boss不被击飞，冲锋不能穿崖/瞬移到落点。 |
| zealot.2 | 光盾卫士 | zealot | 受敌伤破盾时触发短反击窗口，近战斩击恢复有限原生盾。 只由敌伤击破原生盾触发，临时盾消失不触发；回盾按缺口和每秒预算封顶。 |
| zealot.3 | 裂阵先锋 | zealot | 冲锋触敌时横扫落点，前三个周期每击都撕裂敌阵。 合法冲锋路径、不得隔墙触发；前三次连击是实际攻击周期，冷却不被脱战抹掉。 全队狂热者攻击、攻速、生命、原生盾、生命/盾护甲、移动各＋20%；主武器零甲持续输出×1.44。 |
| adept.2 | 晨星巡猎 | adept | 脱战后首个目标承受四周期突袭，随后靠高机动绕开近战。 脱战只按真实开火空窗；不新增必须手动影子切换，不靠攻击动画重置冷却。 |
| adept.3 | 裂光共振 | adept | 攻击标记敌人，第四次命中令标记爆裂并波及轻甲群。 第五倍包替换第四发主伤，邻敌只吃一包；本机标记不被别家兵反复兑换。 |
| stalker.2 | 裂隙刺客 | stalker | 合法闪现后六次武器周期高爆发，并获得有限相位护障。 保留手动闪现与地形校验；无自动传送，无武器/CD刷新；触发有十二秒独立冷却。 |
| stalker.3 | 晶棘破甲 | stalker | 晶体弹穿过目标正护甲的一部分，并对重甲形成穿透线。 忽略正护甲为自身包规则，不改变全队敌甲；生命/盾分别算，不能忽略敌伤免疫。 |
| sentry.2 | 静滞监察者 | sentry；guardian | 每个控制周期短暂停住范围普通敌人，Boss仅降攻速与移速。 敌人停滞期间本稿可受伤；同名停滞仅刷新有限期限，不叠加时长；Boss不完全停止；能源不足不施放。 半径8持续范围：武器伤害－30%、攻速－35%、移动－45%；Boss各半效。 |
| sentry.3 | 折射惩戒 | sentry；guardian | 敌伤被本体护盾实际吸收后储存折射，下一次武器周期释放穿透束。 敌伤经护甲后实际盾损才存入，不能从回盾/无敌无限刷；束伤不再次充能。 |
| immortal.2 | 永恒壁垒 | immortal | 屏障规模大增，被打破后短时恢复原生盾并保护自身前线位置。 屏障触发沿既有条件，新增破屏反应有独立冷却；有限屏障不等于斯旺无敌。 |
| immortal.3 | 引力裁决 | immortal | 反甲炮在主目标周围生成短引力区，把地面杂兵收拢给后排清场。 每三秒一个牵引区；合法路径，Boss/领主免拉只减速；对空不生成拉地面效果。 半径8：生命/盾护甲＋5，承受直接武器伤害降低15%。 |
| colossus.2 | 地平线切割 | colossus | 射程和切割长度扩大，以窄双束远距贯穿敌人纵队。 射程/长度二倍，宽度变窄；视线障碍仍挡，不从地图外无成本开火。 |
| colossus.3 | 震慑行者 | colossus | 双束每第四周期释放一次广域震慑，延缓近敌进攻并重构自己护盾。 第四周期额外冲击只一包，Boss控制减半；回盾按缺口，不每个命中敌人恢复一次。 |
| phoenix.2 | 引力狩猎者 | phoenix | 同时维持两个合法引力目标，悬空目标接受更强己方离子打击。 只对原规则可举目标；Boss/领主不悬空，不能凭举起给建筑开对空射击资格。 |
| phoenix.3 | 相位突击翼 | phoenix | 脱战储存一次相位冲击，进战首六周期以三倍离子火力突袭。 六秒脱战储能才护障完整，开火消耗；没有自动闪现/穿墙，无无限护障叠加。 来源脱战2秒后，全队原生盾友军移速＋30%；入战按储能比例给半径8内5名其他友军最多20%原生盾护障，6秒，团队触发间隔12秒。 |
| void_ray.2 | 裂光分束舰 | void-ray | 主束旁分出三条辅助束，同时压制附近其他敌人。 主目标1.5倍，三个不同邻敌各普通主包75%；不对同一目标叠四束，不递归复制束流。 |
| void_ray.3 | 能量虹吸舰 | void-ray | 束流有效伤害回充自身原生盾，满盾溢出形成有限临时护障。 不吸无敌/未命中包，治疗溢出预算不可再回盾；临时护障不改变原生盾上限。 |
| carrier.2 | 重矛母舰 | carrier | 四架截击机改为重型穿甲火力，每第四周期追加一次重矛包。 重矛追加一次已增强主包，单周期峰值九倍对甲；技能强度不从虚假新增模型/轰炸机计算。 |
| carrier.3 | 圣盾巡航舰 | carrier | 母舰盾损先由有限矩阵分担，所属截击机回收时真实维修重整。 只有实际回到母舰近处且不攻击的子机维修；不满血传送重生，不改变其他航母/英雄所属权。 生命＋30%、原生盾＋40%、攻速＋25%、生命/盾护甲＋5，半径10。 |

## 英雄身份

18 位英雄由已批准的专属攻击、技能、死亡和光环适配器继续负责；`CombatFxProfile` 排除英雄及英雄所属子单位。英雄同名基础兵种不能抢占这些效果。

| 身份 | 名称 | 原有技能 | 归属 |
| --- | --- | --- | --- |
| raynor | 雷诺 | 穿透射击 | 已批准专属英雄适配器 |
| tychus | 泰凯斯 | 手雷 | 已批准专属英雄适配器 |
| nova | 诺娃 | 狙击 | 已批准专属英雄适配器 |
| swann | 斯旺 | 紧急抢修 | 已批准专属英雄适配器 |
| tosh | 托什 | 精神冲击 | 已批准专属英雄适配器 |
| kerrigan | 凯瑞甘 | 灵能冲击 | 已批准专属英雄适配器 |
| zagara | 扎加拉 | 爆虫弹幕 | 已批准专属英雄适配器 |
| dehaka | 德哈卡 | 原始吞噬 | 已批准专属英雄适配器 |
| stukov | 斯托科夫 | 腐蚀弹 | 已批准专属英雄适配器 |
| niadra | 妮雅德拉 | 殖群复生 | 已批准专属英雄适配器 |
| artanis | 阿塔尼斯 | 护盾复苏 | 已批准专属英雄适配器 |
| zeratul | 泽拉图 | 虚空斩 | 已批准专属英雄适配器 |
| alarak | 阿拉纳克 | 毁灭波 | 已批准专属英雄适配器 |
| fenix | 菲尼克斯 | 太阳炮 | 已批准专属英雄适配器 |
| vorazun | 沃拉尊 | 时间停滞 | 已批准专属英雄适配器 |
| yamato_battlecruiser | 大和战列巡洋舰 | 大和聚变炮 | 已批准专属英雄适配器 |
| hots_leviathan | 利维坦 | 生体等离子风暴 | 已批准专属英雄适配器 |
| purifier_flagship | 净化者旗舰 | 聚变核爆 | 已批准专属英雄适配器 |

## 原始模型散列

同一路径允许多个模型定义共享，但定义的缩放、动画及 Actor 层仍各自保留。

| 模型定义 | 原文件 | SHA-256 | 网格／粒子／光带／投影 |
| --- | --- | --- | --- |
| MarineAttackLaunch | assets/private/m3/marineweaponlaunch.m3 | 54ffb631ecc8724c3c019c3f040ab1c68e7435b7a0245ccfe937bb0195cf5178 | 有 / 1 / 0 / 0 |
| MarineAttackImpact | assets/private/m3/marineweaponimpact.m3 | 4d4e7fc6b7f6e03d605872f288c0838d523e8d041d43453aa112915c47ee608c | 无 / 2 / 0 / 0 |
| MarauderAttackLaunch | assets/private/m3/maraudermissilelaunch.m3 | 84a444cf91194a1aff18bfb96ab44f64c9088ca69d7a7eba50ef4f9ea8afee7c | 无 / 2 / 0 / 0 |
| PunisherGrenadesLMWeapon | assets/private/m3/maraudermissile.m3 | f2fc13a2e7f9d3eabc3accd4fcd538d3e2faf68ac117d4a9700796e98be7de62 | 有 / 1 / 1 / 0 |
| MarauderBaseAttackImpact | assets/private/m3/marauderbasemissileimpact.m3 | e68da3d24aacdfccc3a3530b7d3020e1842e607249fb2b1d6a265b5dea5054bc | 有 / 2 / 0 / 0 |
| ReaperAttackLaunch | assets/private/m3/reaperweaponlaunch.m3 | 6449d173d212c883d9fc28ea37f06f75f3c4b713d049cde936bcd0f164f9d104 | 无 / 2 / 0 / 0 |
| ReaperAttackImpact | assets/private/m3/reaperweaponimpact.m3 | ee7c7e70c7a77fb12692514f452c678d5f86a93431162f02cd6942286550e8e7 | 无 / 2 / 0 / 0 |
| HellionAttackBeam | assets/private/m3/hellionbeam.m3 | 00cfb8012f5950a3b8cf6682820c84877e687db9cc6169e5211a32065015b65d | 无 / 2 / 0 / 0 |
| HellionAttackDamageReaction | assets/private/m3/hellionbeamimpact.m3 | f6bd09ed7fda71a915bfc4a937290f85a32316e7fa7ec144d8867117c6f9f586 | 无 / 2 / 0 / 0 |
| HellionTankAttackLaunch | assets/private/m3/helliontankattack.m3 | d1bc634463d8c4d4fd14d90e2b8ecb07d8a74eda9f1eaf254b8d6ebcb899ed4a | 无 / 2 / 1 / 0 |
| HellionTankAttackFireAddition | assets/private/m3/fireimpact.m3 | 30b1b994657ce08abe2ef45eb82b8d5ea9561b1df83e2b0953227b6ef75fda74 | 无 / 2 / 0 / 0 |
| SiegeTankAttackLaunch | assets/private/m3/tankweaponlaunch.m3 | 41a60eb7599d9db4373a4651a497cdcede3086a8adb25696f1e10c6a008adc73 | 有 / 3 / 0 / 0 |
| SiegeTankAttackImpact | assets/private/m3/tankweaponimpact.m3 | c667a6c30205ce3106a176663def3c8a279f7bbbb416942e6d5c43463d1ecad8 | 无 / 7 / 0 / 0 |
| SiegeTankSiegedAttackLaunch | assets/private/m3/siegetankweaponlaunch.m3 | 08ec75bb43c235600d1c4240d2225735abd2ddab44c6c373d6b13a4570aa447f | 无 / 7 / 0 / 0 |
| SiegeTankSiegedAttackImpact | assets/private/m3/siegetankweaponimpact.m3 | 4277ecd82052423a6c7e78d894edfe360a3b79b7c42d7884cb47526343e4b2f0 | 有 / 10 / 0 / 1 |
| ThorHandGunAttackLaunch | assets/private/m3/thorarmmissilelaunch.m3 | b6740049288a5ec526139f665a39d5616357896486dc61000d9678f5644b8a7f | 有 / 4 / 0 / 0 |
| ThorHandGunAttackImpact | assets/private/m3/thorarmmissileimpact.m3 | 62022cc79acf918f4d5bcf3ae1e473ae5a19e7eb451bb192af040008a872b82b | 有 / 4 / 0 / 0 |
| ThorAAAttackLaunch | assets/private/m3/thorshouldermissilelaunch.m3 | f390a3c7b929d6fd085f1bb7027c25f3b813a6721e6ec1b4dce186aec8f5e96f | 无 / 1 / 0 / 0 |
| ThorAAWeapon | assets/private/m3/thorshouldermissile.m3 | b5aec33470494ac390310bb38daa2e6bc817c665f8e4b1dcc36a7f4b0775757f | 有 / 2 / 1 / 0 |
| ThorAAAttackImpact | assets/private/m3/thorchestmissileimpact.m3 | dac0e75685146428a2a64fc857673f7d6a27d87de6767d8c9214031c61ee86d2 | 无 / 6 / 0 / 0 |
| ThorAAAttackLaunchLance | assets/private/m3/thorarmmissilelaunch.m3 | b6740049288a5ec526139f665a39d5616357896486dc61000d9678f5644b8a7f | 有 / 4 / 0 / 0 |
| ThorAAAttackImpactLance | assets/private/m3/thoraircannonimpact.m3 | 0a5868b99277d43aef3d7b33bb0fc97831561b770ddaa4e650fcd964381fa7aa | 无 / 5 / 0 / 0 |
| VikingFighterAttackLaunch | assets/private/m3/vikingfightermissilelaunch.m3 | 5711c42b898b6d40634bb0cf070d72da57b9d4cac232d11f4200981c8ac2edaf | 无 / 1 / 0 / 0 |
| VikingFighterWeapon | assets/private/m3/vikingfightermissile.m3 | 2ce54d87360bc108b9c1568d9e4433e37dbf1aecddfec0ab51333cb6d8f7b16f | 有 / 1 / 1 / 0 |
| VikingFighterAttackImpact | assets/private/m3/vikingfightermissileimpact.m3 | b2bbbc3a1f4af7ed27863d8e9baa35c8b08a51a6a8304120da31c4822b1082c5 | 无 / 5 / 0 / 0 |
| VikingAssaultAttackLaunch | assets/private/m3/vikingassaultweaponlaunch.m3 | d8e28b395a1325b166f17d4eb8dea154bf67fc92db23a1df7996c4df8f9a6008 | 有 / 4 / 0 / 0 |
| VikingAssaultAttackImpact | assets/private/m3/vikingassaultweaponimpact.m3 | b1e4e48584c632a2ee8eaea4b99e60bd6c55d4272168481081283bef75dbb704 | 无 / 2 / 0 / 0 |
| BacklashRocketsLMWeapon | assets/private/m3/bansheemissile.m3 | 7c24499ade66ee4fc36f4b1007c6f662013f390b958ccd933b76eb32f412f2aa | 有 / 3 / 1 / 0 |
| BansheeAttackImpact | assets/private/m3/bansheemissileimpact.m3 | 2f7f9b8a7ee496fd70c7b218ea789b40e912345492f13da35e1b09b1b562a7f7 | 无 / 6 / 0 / 0 |
| MedivacHealBeam | assets/private/m3/medivacbeam.m3 | 71fa04fe9f709f97e052fd4c751cedd4a8dfd6758ccc17c4d5145c92ae40c4d9 | 无 / 1 / 1 / 0 |
| MedicHealModel | assets/private/m3/medicheal.m3 | 02d0d09b75285922990c4781fbbef924edd04844c7ee21baa7945c2f954bf88f | 无 / 2 / 0 / 0 |
| BanelingDeath | assets/private/m3/banelingex1death.m3 | 64104113b94d107f8e08b6661bb26a87f7191ad724f94aba11d31ec6c67309aa | 有 / 8 / 0 / 1 |
| AcidSalivaWeapon | assets/private/m3/roachmissileex1.m3 | 9c7a544ba67db4dbd6b81e04fa52c09025095e90144e7d887a80335001948bd9 | 无 / 3 / 0 / 0 |
| RoachMissileImpact | assets/private/m3/roachmissileimpactex1.m3 | 4862f2ffe0655cff6bea3810064ce5aec2db5178e3116181ea9ddd33e427dff7 | 无 / 2 / 0 / 0 |
| RavagerWeaponMissile | assets/private/m3/ravager_missile.m3 | 268b0b5350868b8ab2f070744a4810fda395372e7d2a14ffbda3904793cd0b8f | 有 / 1 / 0 / 0 |
| RavagerWeaponImpact | assets/private/m3/ravager_missile_impact.m3 | 6b991fcb1673e1717b99d3c4eab770a68fe701bc897f5bf49000789ddb7a895e | 无 / 3 / 0 / 0 |
| RavagerCorrosiveBileMissile | assets/private/m3/ravager_artillery_missile.m3 | b014240fa36d8f3d0bc695b2663747c833f399b8abb66d54669badf43a829e58 | 有 / 1 / 1 / 0 |
| RavagerCorrosiveBileImpact | assets/private/m3/ravager_artillery_missile_impact.m3 | 94543d07d0836ee219c0da5b3bfec7f670f809b21faa323829d840507732dd21 | 有 / 8 / 0 / 1 |
| NeedleSpinesWeapon | assets/private/m3/hydraliskmissile.m3 | f5cc0809a53e7fbd19124a4edf0b2e664debabbe41b66bfbd52e117c2d266ac6 | 有 / 0 / 0 / 0 |
| HydraliskAttackImpact | assets/private/m3/mutaliskmissileimpact.m3 | c29120235c99abdc54917255b6e2e5d2e8cce775e9a430b2ff219135cc5dcb53 | 无 / 2 / 0 / 0 |
| TalonsMissileWeapon | assets/private/m3/hydraliskmissile.m3 | f5cc0809a53e7fbd19124a4edf0b2e664debabbe41b66bfbd52e117c2d266ac6 | 有 / 0 / 0 / 0 |
| QueenMissileImpact | assets/private/m3/mutaliskmissileimpact.m3 | c29120235c99abdc54917255b6e2e5d2e8cce775e9a430b2ff219135cc5dcb53 | 无 / 2 / 0 / 0 |
| AcidSpinesWeapon | assets/private/m3/hydraliskmissile.m3 | f5cc0809a53e7fbd19124a4edf0b2e664debabbe41b66bfbd52e117c2d266ac6 | 有 / 0 / 0 / 0 |
| SquibTransfusion | assets/private/m3/regeneration.m3 | bfe9d69cb96b9f940d460af44b3a8ed785eda790da199f75f84e95938b2ee57e | 无 / 5 / 0 / 0 |
| LurkerMPAttackSpike | assets/private/m3/lurkermissile_impact_ex2.m3 | f1607feca6754a8e5317cf221499aba01d327d6d0086d8af6cc0cdabd338b88b | 无 / 1 / 0 / 0 |
| LurkerAttackSpikeEx2 | assets/private/m3/lurkermissile_ac.m3 | 0cf2ff51dbae4da7fdaecd61556eb47fd696c391e35c657cb1f9bb8e204930d4 | 有 / 2 / 0 / 0 |
| GlaiveWurmWeapon | assets/private/m3/mutaliskmissile.m3 | 8de75c3280202fd84b78b25e080c540316c28f3a89fd9736182b370800b2abbc | 有 / 1 / 0 / 0 |
| MutaliskAttackSegment1Impact | assets/private/m3/mutaliskmissileimpact.m3 | c29120235c99abdc54917255b6e2e5d2e8cce775e9a430b2ff219135cc5dcb53 | 无 / 2 / 0 / 0 |
| CorruptorAttackLaunch | assets/private/m3/corruptormissilelaunch.m3 | 83fc29d97b031ede36ed3e00861c0ea9edd7ce2b34a903d1e363de8ab8cb7b09 | 无 / 1 / 0 / 0 |
| ParasiteSporeWeapon | assets/private/m3/corruptormissile.m3 | 10ebe7f7c77ca4e46ad5a61eada0556f27cfdab08a60d9d7a73e2df432641ac7 | 有 / 0 / 1 / 0 |
| CorruptorAttackImpact | assets/private/m3/corruptormissileimpact.m3 | 3c187d8a6235d5f60c38997b2df1f6f17f6860c44d53d6ff3ef6b4fde214ad63 | 无 / 3 / 0 / 0 |
| Ultralisk | assets/private/m3/ultraliskex1.m3 | f98b030ea4b1839348c16327406c1860a1183f0fc5f4c8f7e80e21d424814d29 | 无 / 5 / 0 / 1 |
| Zealot | assets/private/m3/zealot_ex2.m3 | 56fbfe67559d950e5d39fcb257bae345e4950634dabbd056624ad9b3c9f77d76 | 无 / 2 / 4 / 0 |
| AdeptWeapon | assets/private/m3/adept_missile.m3 | 9ab7bde2d09e06399a855ec6b11f6f86e09d7ad20e9010bbf7cc32bb3547f02f | 有 / 0 / 1 / 0 |
| AdeptImpact | assets/private/m3/adept_missile_impact.m3 | ab51500bd55da24f7b683570e381b02a7773d6abd8e7567ad0e51feab8b5df74 | 无 / 4 / 0 / 0 |
| StalkerWeapon | assets/private/m3/stalkermissile.m3 | bff2264b3bfe8a9fb98ed86cf5653daf5cdec9a114e79f4b0b7857464fa96b95 | 无 / 0 / 2 / 0 |
| StalkerAttackImpact | assets/private/m3/stalkermissileimpact.m3 | aaa3985c1b7e21409426f420ab8a0c98ff580b10da3f4711f74312fd3d44de9b | 有 / 5 / 0 / 0 |
| SentryAttackBeam | assets/private/m3/nullifierbeam.m3 | e9619b6a5e4d4dc8e1ed60454eaecad684beb5e18b59eaeb449c7dc6bd819290 | 无 / 5 / 1 / 0 |
| GuardianShield | assets/private/m3/sentryshieldbubble_ex2.m3 | 15143467d8e8ea33ef07b395606e1a39bb055cccdb5bba5a8a2f2f1ffef14e75 | 有 / 1 / 0 / 0 |
| GuardianShieldImpact | assets/private/m3/sentryshieldimpact.m3 | fc4674f48496173267580bc62827b9a1055027f5b4bfbe055b4f6c7e0d365528 | 无 / 1 / 0 / 0 |
| Immortal | assets/private/m3/immortal_ex2.m3 | d5f34c9efc37c120883764ca0dcc19162805afd707f7404f083fa98260c454e1 | 无 / 4 / 0 / 0 |
| ImmortalAttackImpact | assets/private/m3/immortalmissileimpact.m3 | 66e31c974a0d666cb0cf502211a9456870fcaaed7d94de3570a7905236e44a3d | 有 / 8 / 0 / 0 |
| ColossusAttackBeam | assets/private/m3/colossusbeam.m3 | 1d5ba0e658504e156708157770fd814eb12a306395453797f7517595885a4e3b | 无 / 2 / 5 / 0 |
| ColossusAttackBeamImpact | assets/private/m3/colossusbeamburn.m3 | 64c0646e1b4d9abc779da1ed3e605820b99c91b639508be090b39ede632e5fdb | 有 / 5 / 0 / 0 |
| HighTemplarWeapon | assets/private/m3/adeptsoulmissile.m3 | 1e54477db9f653f7891997d627d37fa8695e28d151bfec12fef3f09e32b8e79e | 无 / 0 / 2 / 0 |
| HighTemplarAttackImpact | assets/private/m3/adeptsoulmissileimpact.m3 | 23225c0ef68a0ab05de87abf24675ad465d5e510db2324b0739f88f20032e851 | 有 / 3 / 0 / 0 |
| HighTemplarPsiStormModel | assets/private/m3/psistorm.m3 | d5d24666f2ff2f6e2ae5b55eef122b2593388e701909c8a248b01d28330b2bbc | 有 / 7 / 11 / 0 |
| HighTemplarPsiStormImpact | assets/private/m3/psistormimpact.m3 | 90db46fac3fd5753c2532811881c341fd80d113909ff8a7fc625ed6579e038c1 | 无 / 2 / 3 / 0 |
| IonCannonsWeapon | assets/private/m3/phoenixmissile.m3 | ddcc34cc3e78f2bb7219a121da1300cf73c0e65a5faff7338f0a6625fb3588a1 | 无 / 0 / 1 / 0 |
| PhoenixAirAttackImpact | assets/private/m3/phoenixmissileimpact.m3 | e7b3d45c20ff3a66c31c13b653b0ba86b861de79b0234cb71f06050038b2ebc7 | 无 / 3 / 0 / 0 |
| VoidRayAttackBeam | assets/private/m3/warpraymissile.m3 | a956109df93c15d59b7aa23ce86f36cfb9f65a098a173a1008d62109e0ed9bbd | 有 / 4 / 3 / 0 |
| VoidRayCenterBeam | assets/private/m3/voidraycenterbeam.m3 | e34e1d9196fad3ccfa7461404851e7826634dfcaea15c42c46e48583fd10bacd | 无 / 0 / 1 / 0 |
| InterceptorAttackBeam | assets/private/m3/interceptormissile.m3 | ffe454a3231da0b0003480bbd6609cc492ae1298c9f64289064da5c59eec1edd | 无 / 0 / 1 / 0 |
| InterceptorAttackImpact | assets/private/m3/interceptormissileimpact.m3 | 5db8a0e13f01641d8e723d4e2646674c8f877b11cdbba86b5ffd5229993809b1 | 无 / 2 / 0 / 0 |
| ProtossShieldDamage | assets/private/m3/protossshield.m3 | 45f8c0e057462407488fabcc4a1ddeee56d0f4580a83a8b196444ac3984f9eca | 有 / 0 / 0 / 0 |
| ProtossShieldRipple | assets/private/m3/protossshieldimpactpoint.m3 | 8959ea05650020ab47d7e52e39920b46b639f0c96552f43043bcbca7c031fc2a | 无 / 2 / 0 / 0 |
| ProtossShieldFull | assets/private/m3/protossshieldfull.m3 | 0ad225b6c11e1bb8f38059847524258431cd7ef13425d02fc5caf21dece2dd0d | 有 / 0 / 0 / 0 |
| BloodTargetImpact | assets/private/m3/bloodtargetimpact.m3 | 5f1d851031f688b26703ae3bc164dcd362bf30790c442e05e37dd6ea36473110 | 无 / 2 / 0 / 0 |
| HydraliskGroundAttackImpactShield | assets/private/m3/hydraliskmissileimpactshield.m3 | 2163129a18126ea62f1d885e140bb121b27c4fd3ba992fc0bad9802b9dff647d | 有 / 0 / 0 / 0 |
| QueenAttackLaunch | assets/private/m3/hydraliskmissilelaunch.m3 | 2f809b904a4043b9172cf74f51a94370f97a2e8578350512c95c8887d610730e | 无 / 1 / 0 / 0 |
| AcidSpinesAttackLaunch | assets/private/m3/hydraliskmissilelaunch.m3 | 2f809b904a4043b9172cf74f51a94370f97a2e8578350512c95c8887d610730e | 无 / 1 / 0 / 0 |
| MutaliskAttackSegment2Impact | assets/private/m3/mutaliskmissileimpact.m3 | c29120235c99abdc54917255b6e2e5d2e8cce775e9a430b2ff219135cc5dcb53 | 无 / 2 / 0 / 0 |
| MutaliskAttackSegment3Impact | assets/private/m3/mutaliskmissileimpact.m3 | c29120235c99abdc54917255b6e2e5d2e8cce775e9a430b2ff219135cc5dcb53 | 无 / 2 / 0 / 0 |

## 挂点、状态和适配边界

- 劫掠者按原生射击序列奇偶交替左右炮口；雷神高冲击按原始 Attachment Method 的两组炮口交替；死神、女妖、维京和凤凰保留各自成对挂点。所有挂点来自原身体及实际攻击姿势。
- 狂热者、雷兽与不朽者只补其原身体附属的发射器／光带，不额外复制一份身体网格。不朽者屏障和此前已修复死亡材质保留。
- 截击机从实际子单位发射；航母自身不产生伪造攻击光束。5 种形态与敌方 9 类×3 层级读取实际身份及武器。建筑、工人、载体、死亡和召唤物仍由对应原生生命周期负责。
- 短期视觉回执不新增存档字段；读档不会补播已经结束的命中。持续效果从现有状态重建，暂停冻结游戏时钟，粒子随机值独立于 World RNG。
- 支持原始网格、标准／复合材质、动画粒子、光带及贴地投影。M3 的 type 2 屏幕位移材质未实现背景折射，涉及下列模型；这些附加背景扭曲层不作为已还原属性：MarauderBaseAttackImpact, SiegeTankSiegedAttackImpact, ThorHandGunAttackLaunch, ThorHandGunAttackImpact, ThorAAAttackLaunchLance, BanelingDeath, RavagerCorrosiveBileImpact, StalkerAttackImpact, GuardianShield, ImmortalAttackImpact, ColossusAttackBeamImpact, HighTemplarAttackImpact, HighTemplarPsiStormModel, VoidRayAttackBeam, ProtossShieldRipple。
- 科学球沿用已经确认的受治疗者纳米修复雾，历史原始来源限制仍开放。原版客户端逐画面对照、真实设备、自然流程与人工验收不因本表生成而通过。

## 已核对适配器

| 文件 | SHA-256 |
| --- | --- |
| src/render/effects/source-combat-effects.ts | 6f3eecb064af67fe27dbe93fd20c69eec41ac50257295fcdf00fdb79841b9aea |
| src/render/effects/combat-fx-profile.ts | 25694fafac325f1c10f663025b70cc20cb733d3108d7754b8d5db20d496383cd |
| src/render/effects/terran-elite-effects.ts | de063e179f944e02283c75f27c35aa98aeea9f24abee85c20f85d221c2330ba5 |
| src/render/effects/zerg-elite-effects.ts | 99986badc96f56607a9967adefa96675904d74330e3a5340a13ca34f0db43250 |
| src/render/effects/protoss-elite-effects.ts | b4fff251059a58e7ade6c3260771fe59cfe597f509710aaac6f95213b906d729 |
| src/render/effects/elite-support-effects.ts | 17e4ed6b479e75bfdcf0606b4ed5cdd8555a764281438096e48e13b29a0a5ec6 |
| src/render/effects/ordinary-medical-effects.ts | 5e6f906edba17b20e83b158225c1209919935bbbaa53147eb02d8f0dd82a0306 |
| src/render/effects/confirmed-hero/controller.ts | bf601de12d11102429ae04ff96c206f2badb2da7d6d297a50c717fd190d292c6 |
| src/render/effects/confirmed-hero/attack-effects.ts | 34f819d1e9b98d660262012c5d6134b5a8dd4f5017611c773b87d66b915dbb7a |
| src/render/effects/confirmed-hero/skill-effects.ts | 76b2e2f6855a21bef43ef8821ecaa59d3bbbc2a2e7557e05b7cf78fc1da2fff7 |
| src/render/effects/protoss-hero-effects.ts | 95c4ba01a43ffc6c0fcd43d183620d9700cf078fed43dbcc054467f366781aa5 |
| src/render/effects/zerg-hero-effects.ts | f68f4531f8d8d228a0691f419b1dfa34a5eb4c9e7e03fe4aeef8ee48c1fab5ee |
