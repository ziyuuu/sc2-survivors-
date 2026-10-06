/** Design data only. Never import this module or its JSON output from runtime. */
export const revision = '2026-10-05-team-auras-r1';
export const eliteChanges = [
  {
    id:'zergling.3', role:'家族指挥', effectName:'血巢号令', kind:'buff', radius:null,
    recipients:'全队永久跳虫家族，普通与三种精英；每个实际双生身体各生效一次',
    anchorIds:['marine.3'], stats:{damage:.20,speed:.20,maxHp:.20,maxShield:.20,armorPct:.20,shieldArmorPct:.20,move:.20},
    before:'只有双生分摊、吸血与幸存再生，没有团队指挥增益。',
    after:'全队跳虫攻击、攻速、生命、原生盾、生命/盾护甲、移动各＋20%；主武器零甲持续输出×1.44。',
    retained:'保留50%双生分摊、25%实际生命伤吸血、900步幸存再生及60%恢复生命。',
    rules:['来源两体任一存活即可维持；同席位两体不算两个光环源。','原生盾只放大已有盾；不凭光环给跳虫创造护盾。','与人族指挥官相同的家族指挥层；不能按两个身体重复乘1.2。'],
    presentation:'沿用共生血巢身体与攻击；来源脚下短促有机脉动，指挥范围为全队，不画巨大全图圈。'
  },
  {
    id:'queen.1', role:'生体防护', effectName:'母巢护育', kind:'buff', radius:9,
    recipients:'范围内永久生物战斗友军，含英雄与来源', anchorIds:['medivac.1'],
    stats:{maxHp:.45,armorFlat:6,regenHpPerSecond:.02},
    replacements:{radius:9,allyHpIncrease:.45,allyArmorAdd:6},
    before:'半径8，生命＋40%、生命护甲＋4、每秒恢复最大生命2%。',
    after:'半径9，生命＋45%、生命护甲＋6、每秒恢复最大生命2%。',
    retained:'原45秒注卵、同舱一次、真实攻击与2%生命再生规则保留。',
    rules:['相比医疗指挥的35%生命、5甲、半径8，生物限定换取更强生命维护。','进入/离开范围按伤损比例调整生命上限；不会自动补满。','同种女王不叠；与新的空巢生命光环同属精英生命层，取45%而非相乘。'],
    presentation:'保留已确认的细胞/膜纹医疗素材；真实恢复时在受益者处显示，无连接长线。'
  },
  {
    id:'queen.2', role:'治疗放大', effectName:'鲜血共生', kind:'conditional-buff', radius:8,
    recipients:'本次输血冻结名单中实际获得生命恢复的最多5名永久生物战斗友军', anchorIds:['medivac.2','medivac.3'],
    stats:{receivedHealing:.30,weaponLifeLeech:.15},
    trigger:{duration:6,leechMaxHpPerSecond:.10,requiresEffectiveHpHeal:true,maxTargets:5},
    before:'50能量、12秒冷却；4秒内给5个冻结目标治疗，每体I级240/秒，无附加团队增益。',
    after:'原输血实际恢复后给予6秒：受到生命治疗＋30%，武器实际生命伤吸血15%，每体每秒吸血最多自身最大生命10%。',
    retained:'原240 I/秒、范围8、4秒16个脉冲、5个目标、12秒冷却、50能量及死亡停疗全部保留。',
    rules:['首次有效脉冲完成后授予增益；后续脉冲可受已有增益，每次治疗只放大一次。','只有有效生命恢复刷新6秒；对满血身体空放不授予/刷新。','吸血不吃受到治疗加成、不触发其他输血/吸血/治疗转盾；不从护盾、屏障或过量伤害吸血。','若身体原有同类吸血比例为L，本效果只补max(0,15%－L)的比例；新增部分每秒最多10%最大生命，旧吸血比例/上限不改。','同名授血增益取强并刷新剩余期限，不按治疗脉冲数叠加。按次付费的输血仍50能量；按有效HP付费的治疗仍按实际恢复量付费。'],
    presentation:'保留输血液流；仅在实际治疗和吸血时出现贴身微粒，不添加常驻粗线。'
  },
  {
    id:'queen.3', role:'持续压制', effectName:'巢毒压制', kind:'debuff', radius:8,
    recipients:'范围内可见、有视线的地空敌方战斗单位', anchorIds:['marauder.1'],
    stats:{weaponSuppression:.30,attackSlow:.35,moveSlow:.45}, bossControlScale:.5,
    before:'毒刺命中仅使攻速－30%、移动－50%，持续3秒。',
    after:'半径8持续范围：武器伤害－30%、攻速－35%、移动－45%；Boss各半效。',
    retained:'原2倍毒刺、半径3、3秒命中减益继续；原命中移动－50%仍可更强。',
    rules:['同源范围与命中减益逐属性取强，不把本机两种攻速降低相加。','离开范围即失去范围项；已真实命中的毒刺按原3秒到期。','普通敌原生武器DPS剩45.5%，Boss剩70.125%，与震撼弹专家整套压制对齐。'],
    presentation:'保留毒刺与命中素材；来源为低矮毒雾纹，敌体短暂毒性标记，不覆盖整片绿色实心圆。'
  },
  {
    id:'ravager.3', role:'范围破防', effectName:'腐蚀气溶胶', kind:'debuff', radius:8,
    recipients:'范围内可见、有视线的地空敌方战斗单位', anchorIds:['banshee.1','marauder.2'],
    stats:{armorReduction:.45,defenseReduction:.25},
    before:'原胆汁酸雨仅有固定伤害与地面迟滞，缺少稳定全队破防。',
    after:'半径8持续范围：敌正生命/盾护甲－45%，已有百分比减伤相对降低25%。',
    retained:'原胆汁、地面半径4酸雨、6秒、I级380/秒及移动降低均保留。',
    rules:['新气溶胶来自活来源半径8；旧酸雨仍只在真实落点半径4作用地面，不扩大原技能命中圈。','减伤30%变为22.5%，不是减去25个百分点；无敌和有限屏障不受此项剥除。','本光环与旧酸星/獠牙等百分比破甲取强；45%不会盖掉已有50%破甲。'],
    presentation:'保留已确认胆汁和酸雨；新增贴身酸蚀点闪，不画源到目标的牵连线。'
  },
  {
    id:'hydralisk.3', role:'集火易伤', effectName:'毒囊裂隙', kind:'conditional-debuff', radius:null, rangeMode:'EXISTING_POISON_TARGETS_NOT_GLOBAL_FIELD',
    recipients:'实际携带本机毒囊的合法敌人，沿用原地空命中与传播资格', anchorIds:['marauder.2','banshee.1'],
    stats:{vulnerabilityPerStack:.05}, trigger:{maxStacks:4,duration:5,secondaryStacks:1},
    before:'最多4层固定毒伤、死亡只传播剩余1层；没有队伍集火增益。',
    after:'每层毒囊附带受到武器伤害＋5%，4层上限＋20%；继发1层仅＋5%。',
    retained:'原每层I级120/秒、5秒、范围4、最多4个传播目标与禁止递归传播全部保留。',
    rules:['易伤跟随真实层数和原剩余期限，不单独刷新永久标记。','Boss可承受实际种下的固定毒伤/易伤，仍不触发死亡传播。','这是渐进集火，不声称20%易伤等于60%破甲；固定技能与毒伤本身不吃武器易伤。'],
    presentation:'保留骨针和毒囊；既有囊体按1–4层增强细节，不加粗弹道。'
  },
  {
    id:'corruptor.2', role:'空军防护', effectName:'护翼巢域', kind:'buff', radius:9,
    recipients:'范围内永久空中战斗友军，含空中英雄与来源；实际子机通过母体继承一次', anchorIds:['medivac.1','thor.1'],
    stats:{maxHp:.35,maxShield:.35,armorFlat:6,shieldArmorFlat:6,speed:.25},
    before:'半径7内替空军分担30%直接生命伤，每秒受来源20%最大生命预算约束。',
    after:'新半径9属性场：生命/原生盾＋35%、生命/盾护甲＋6、攻速＋25%；原半径7分担继续。',
    retained:'原30%分担、自身20%最大生命/秒预算、自身25%减伤及真实空战武器不变。',
    rules:['属性范围9和分担范围7分开；不能把分担偷偷扩到9。','生命/盾上限精英层与同类范围增益取强；来自不同命名光环的固定护甲可相加。','分担仍可能耗尽预算或杀死来源，不能当全队永久30%减伤。','来源可吃属性场，不替自己二次分担；子机不能绕过母体重复领取。'],
    presentation:'保留护翼分担的受击反馈；新属性只用来源脚下薄膜及受益者短促甲壳闪。'
  },
  {
    id:'mutalisk.3', role:'机动支援', effectName:'迁徙血羽', kind:'conditional-buff', radius:null,
    recipients:'移动项为全队永久生物战斗友军；入战护障为周围最多5名其他永久生物战斗友军', anchorIds:['banshee.3','medivac.3'],
    stats:{move:.30}, trigger:{outOfCombatSeconds:2,chargeSeconds:6,entryRadius:8,maxTargets:5,barrierMaxHp:.15,barrierSeconds:4,entryCooldown:12},
    before:'原脱战储能/护壳/开场高速吸血只强化自身。',
    after:'来源脱战2秒后，全队生物移速＋30%；入战按真实储能比例给半径8内5名其他友军最多15%生命护障，4秒，团队触发间隔12秒。',
    retained:'原6秒储能、自身80%生命护障、3秒攻速＋200%、35%实际生命伤吸血保留。',
    rules:['复用原入战消费的冻结储能比例；不增设第二份可独立刷新的储能。','新团队护障排除来源，不再给自身加一层15%；五名按生命缺损比例、距离、稳定ID排序。','只在原真实开火入战时授予；护障同来源刷新到较高剩余值、不相加，切场/读档不重发。','范围内无合法友军不制造收益；移动项与其他精英同类行军光环取最高。'],
    presentation:'沿用血羽开场与护壳纹理；入战给真实受益者短促薄膜，不连接飞行长线。'
  },
  {
    id:'zealot.3', role:'家族指挥', effectName:'先锋战旗', kind:'buff', radius:null,
    recipients:'全队永久狂热者家族，普通与三种精英', anchorIds:['marine.3'],
    stats:{damage:.20,speed:.20,maxHp:.20,maxShield:.20,armorPct:.20,shieldArmorPct:.20,move:.20},
    before:'原冲锋和开场三击仅强化本体，没有家族指挥增益。',
    after:'全队狂热者攻击、攻速、生命、原生盾、生命/盾护甲、移动各＋20%；主武器零甲持续输出×1.44。',
    retained:'原冲锋I级1800、半径3.5、前三周期3倍、10秒冷却与合法路径保持。',
    rules:['沿用人族指挥官的家族指挥层；英雄不因外形/使用狂热者模型被归入家族。','双刃是原实际武器周期，不因战旗多计命中或多乘一次伤害。'],
    presentation:'保留冲锋和剑光；来源脚下短促灵能旗纹，受益兵只在入场时亮一次护盾边缘。'
  },
  {
    id:'sentry.1', role:'护盾防护', effectName:'光穹矩阵', kind:'buff', radius:9,
    recipients:'范围内具有原生盾的永久战斗友军，含英雄与来源', anchorIds:['medivac.1','medivac.2'],
    stats:{maxHp:.20,maxShield:.40,armorFlat:3,shieldArmorFlat:5},
    before:'P4原设计：半径7，花费75能量启动25%减伤和最多7体I级180/秒回盾。',
    after:'新增常驻半径9：生命＋20%、原生盾＋40%、生命护甲＋3、盾护甲＋5。',
    retained:'原主动织盾仍半径7、75能量、约12.86秒窗口/冷却（精确原值见参数）、25%减伤、7体180 I/秒；不把有限能量治疗改成永久免费。',
    rules:['原主动范围7不随新属性范围9扩张；每秒最多7个实际缺盾目标，首脉冲1秒。','原25%守护与普通守护属于原替换通道，不重复生成旧守护；与新阿塔尼斯保护按保护通道取强。','盾上限改变保持损伤比例，不把上限增长当实际回盾，不给无盾单位造盾。'],
    presentation:'沿用原生盾碎面/薄穹顶方向；受益者回盾闪烁，不恢复已被否决的连体射线。'
  },
  {
    id:'sentry.2', role:'持续压制', effectName:'静滞力场', kind:'debuff', radius:8,
    recipients:'范围内可见、有视线的地空敌方战斗单位', anchorIds:['marauder.1'],
    stats:{weaponSuppression:.30,attackSlow:.35,moveSlow:.45}, bossControlScale:.5,
    before:'P4原设计：14秒/75能量的范围4短暂静滞，常驻团队压制缺位。',
    after:'半径8持续范围：武器伤害－30%、攻速－35%、移动－45%；Boss各半效。',
    retained:'原范围4、2.5秒普通静滞、14秒冷却、75能量及Boss仅25%攻速/移速降低保留。',
    rules:['同源主动减速与范围减速逐项取强，Boss主动25%仍可高于范围17.5%/22.5%。','普通静滞仍有限时长；新光环不使Boss停摆、不刷新停滞、不替代能量消耗。','范围压制离区即止，主动静滞按真实独立到期结算。'],
    presentation:'沿用地面灵能折射纹；敌体低频相位闪动，不拉出来源到目标的黏连线。'
  },
  {
    id:'high_templar.3', role:'破防与能量支援', effectName:'离子解构场', kind:'debuff', radius:8,
    recipients:'范围内可见、有视线的地空敌方战斗单位', anchorIds:['banshee.1','marauder.2'],
    stats:{armorReduction:.45,defenseReduction:.25},
    before:'P4原设计只有实际风暴后的6秒织网、减攻速与7体能量回流。',
    after:'新增半径8持续范围：正生命/盾护甲－45%，已有百分比减伤相对降低25%。',
    retained:'原风暴与能量前置、范围5织网、6秒、敌攻速－40%（Boss半效）、7体每秒能量＋6保留。',
    rules:['新破防来自活来源半径8；织网仍是实际风暴落点半径5，不免费生成风暴。','能量只给已有能量池且未满的合法身体；每体最多恢复实际缺口，同名织网不叠加。','百分比破甲与其他源取强，45%不能与同类45%相加为90%。'],
    presentation:'保留细节丰富的风暴与织网；新增敌甲短促离子裂纹，不改变风暴射线/脉冲的已定表现。'
  },
  {
    id:'high_templar.2', role:'反馈集火', effectName:'反馈暴露', kind:'conditional-debuff', radius:4,
    recipients:'实际被原反馈包命中的合法敌人', anchorIds:['marauder.2','banshee.1'],
    stats:{vulnerability:.25}, trigger:{duration:6},
    before:'P4原设计抽取真实能量转伤害，加固定反馈；没有后续集火窗口。',
    after:'反馈实际命中后，受到武器伤害＋25%，持续6秒。',
    retained:'原12秒冷却、75能量、范围4、实际能量×6、I级固定1600及一次消耗保持。',
    rules:['无能量敌人仍只按原固定包受击并得到标记；不虚构能量、不给Boss额外抽能预算。','本次反馈固定包不吃其自己刚授予的武器易伤；其后合法武器包生效。','同名标记刷新不叠层；Boss完整易伤但不会被硬控。'],
    presentation:'保留反馈爆点；标记使用目标上的短暂裂纹，不增加持续连接束。'
  },
  {
    id:'immortal.3', role:'地面阵线防护', effectName:'引力护阵', kind:'buff', radius:8,
    recipients:'范围内永久地面战斗友军，含地面英雄与来源', anchorIds:['thor.1'],
    stats:{armorFlat:5,shieldArmorFlat:5,directWeaponReduction:.15},
    before:'P4原设计为真实牵引及溅射，没有保护地面队伍的常驻属性。',
    after:'半径8：生命/盾护甲＋5，承受直接武器伤害降低15%。',
    retained:'原3秒牵引间隔、半径4、合法拉近2、80%溅射、Boss免拉保持。',
    rules:['15%只处理直接武器包，不减固定技能、持续伤、分摊转移包；不与本机重复套两次。','与光穹/阿塔尼斯的百分比保护取同通道最强，不能把三层保护相乘；固定护甲来自不同命名来源可相加。','单纯进入护阵不拉动任何身体，不修改队伍移动/牵引控制。'],
    presentation:'保留反甲炮和引力作用；来源脚下薄盾片，受击者短闪，范围不画满屏几何大圆。'
  },
  {
    id:'carrier.3', role:'空军防护', effectName:'圣盾航阵', kind:'buff', radius:10,
    recipients:'范围内永久空中战斗友军，含空中英雄与来源；子机通过母体继承一次', anchorIds:['medivac.1','thor.1'],
    stats:{maxHp:.30,maxShield:.40,speed:.25,armorFlat:5,shieldArmorFlat:5},
    before:'P4原设计主要保护母舰本体和所属子机，没有全队空军属性场。',
    after:'生命＋30%、原生盾＋40%、攻速＋25%、生命/盾护甲＋5，半径10。',
    retained:'原母舰自身30%减伤、子机生命2.5倍/火力1.5倍、真实返航半径3内不攻击时每秒修复15%生命全部保留。',
    rules:['返航修复仍只限其实际所属子机，不变成全队空军15%/秒免费治疗。','最大生命/盾精英层与同类范围光环取强；子机先取母体最终修正，不能自己再次穿圈领取。','新光环不能补造阵亡子机、消除付费或改编所属权。'],
    presentation:'保留真实航母/子机和返航表现；属性受益用薄盾膜，母舰技能汇聚粗束保持原确认版。'
  },
  {
    id:'phoenix.3', role:'机动支援', effectName:'相位航路', kind:'conditional-buff', radius:null,
    recipients:'移动项为全队具有原生盾的永久战斗友军；入战护障为周围最多5名其他原生盾友军', anchorIds:['banshee.3','medivac.3'],
    stats:{move:.30}, trigger:{outOfCombatSeconds:2,chargeSeconds:6,entryRadius:8,maxTargets:5,barrierMaxShield:.20,barrierSeconds:6,entryCooldown:12},
    before:'P4原设计的脱战储能、首六周期3倍火力、75%原生盾护障只作用自身。',
    after:'来源脱战2秒后，全队原生盾友军移速＋30%；入战按储能比例给半径8内5名其他友军最多20%原生盾护障，6秒，团队触发间隔12秒。',
    retained:'原6秒储能、首6个周期3倍火力、自身75%原生盾护障及原开火资格保留。',
    rules:['复用原开火消费的储能比例，排除来源，不重复授予自身75%之外的20%护障。','按原生盾缺损比例、距离、稳定ID选择最多5名；临时护障不算原生盾恢复。','新护障同源刷新取较高剩余量，读档/过场不重发；全队行军与同类精英项取最高。','仍无地面普通武器，无自动闪现；不依赖成功举起Boss来触发入战保护。'],
    presentation:'沿用相位开场/护障纹理；受益者出现短促盾瓣，不增加悬空身体或假子机。'
  }
];

export const heroChanges = [
  {
    id:'kerrigan',race:'zerg',name:'凯瑞甘',effectName:'刀锋意志',kind:'buff',radius:null,
    recipients:'全队永久生物战斗友军，含生物英雄与来源',anchorIds:['marine.3','zergling.3'],
    stats:{damage:.50,speed:.30,maxHp:.35,maxShield:.35,armorPct:.30,shieldArmorPct:.30,move:.25},
    after:'攻击＋50%、攻速＋30%、生命/原生盾＋35%、生命/盾护甲＋30%、移动＋25%；全队生物。',
    retainedTeamEffects:[], retained:'原能量/屏障与确认版普攻、技能保持；光环不放大固定技能。',
    comparison:'团队零甲主武器DPS×1.95，高于指挥官×1.44；生命、甲、移动及覆盖一起比较。'
  },
  {
    id:'zagara',race:'zerg',name:'扎加拉',effectName:'虫群围压',kind:'debuff',radius:10,
    recipients:'范围内可见、有视线的地空敌方战斗单位',anchorIds:['marauder.1','queen.3'],
    stats:{attackSlow:.45,weaponSuppression:.30,moveSlow:.50},bossControlScale:1,
    after:'敌攻速－45%、武器伤害－30%、移动－50%；半径10，Boss完整生效。',
    retainedTeamEffects:[{kind:'bioCommand',radius:null,stats:{speed:.40,move:.20}}],
    retained:'原全队生物攻速＋40%、移动＋20%继续；临时爆虫仍真实自爆一次死亡。',
    comparison:'压制后敌武器DPS剩38.5%，精英基准剩45.5%；另有保留的友方1.40倍攻速。'
  },
  {
    id:'dehaka',race:'zerg',name:'德哈卡',effectName:'原始威慑',kind:'debuff',radius:9,
    recipients:'范围内可见、有视线的地空敌方战斗单位',anchorIds:['marauder.1','queen.3'],
    stats:{weaponSuppression:.50,attackSlow:.35,moveSlow:.45},bossControlScale:1,
    after:'敌武器伤害－50%、攻速－35%、移动－45%；半径9，Boss完整生效。',
    retainedTeamEffects:[],retained:'原精华、适应、独立生命储备与吞噬固定伤害/0.35秒时序保持。',
    comparison:'敌武器DPS剩32.5%；以近身威慑换取较强压制，不改变吞噬秒Boss的原固定包。'
  },
  {
    id:'stukov',race:'zerg',name:'斯托科夫',effectName:'感染破绽',kind:'debuff',radius:10,
    recipients:'范围内可见、有视线的地空敌方战斗单位；建筑排除',anchorIds:['banshee.2','hydralisk.3'],
    stats:{vulnerability:.45,healingSuppression:.50},
    plague:{ordinaryMaxHpPerSecond:.06,eliteMaxHpPerSecond:.03,bossMaxHpPerSecond:.012,period:1,firstPulse:1},
    after:'受到武器伤害＋45%、实际生命治疗－50%；每秒瘟疫为入圈时最大生命的普通6%/精英3%/Boss1.2%；半径10。',
    retainedTeamEffects:[],retained:'原感染、既有酸池/寄生及确认版攻击技能保持；新瘟疫不是替换原固定技能。',
    comparison:'对照V级瘟疫女妖5%/2.5%/1%分别提高20%，并增加集火与抑疗；不能把易伤重复乘到瘟疫。',
    rules:['入圈冻结当时最大生命，满1秒才首跳；同目标共享每秒命中闸门，进出圈/多源/读档不补跳。','使用原百分比瘟疫对应的合法伤害管线、免疫和抗性；禁止直接减HP、阈值处决、吸血或传播递归。','来源死亡/离区停止后续瘟疫；目标重新合法入圈可更新快照但不能刷新同秒闸门。','抑疗只降低实际生命治疗，非负且不作用原生盾恢复；不抹去复活、付费重建、上限变更或生命储备。']
  },
  {
    id:'niadra',race:'zerg',name:'尼亚德拉',effectName:'殖群甲壳',kind:'buff',radius:12,
    recipients:'范围内永久生物战斗友军，含生物英雄与来源',anchorIds:['medivac.1','queen.1'],
    stats:{maxHp:.60,armorFlat:10,regenHpPerSecond:.03},
    after:'生命＋60%、生命护甲＋10、每秒恢复最大生命3%；半径12。',
    retainedTeamEffects:[{kind:'actualBiologicalHealing',radius:8,targets:7,healPerTargetI:550}],
    retained:'原七体每体550 I/秒、范围8的实际治疗与寄生/有限复生保留；扩大的是光环，不是旧治疗距离。',
    comparison:'相对新版母巢女王45%生命、6甲、2%再生、半径9逐项提高；原有限复生另计，不折成假DPS。'
  },
  {
    id:'hots_leviathan',race:'zerg',name:'利维坦',effectName:'母巢律动',kind:'buff',radius:null,
    recipients:'全队永久生物战斗友军，含生物英雄与来源',anchorIds:['marine.3','zergling.3','corruptor.2'],
    stats:{damage:.20,speed:.60,maxHp:.20,maxShield:.20,armorPct:.30,shieldArmorPct:.30,move:.25},
    after:'攻击＋20%、攻速＋60%、生命/原生盾＋20%、生命/盾护甲＋30%、移动＋25%；全队生物。',
    retainedTeamEffects:[{kind:'oldBioHealth',radius:10,stats:{maxHp:.25}}],
    retained:'原半径10生物生命＋25%继续；与新20%在英雄生命层相加，圈内总＋45%、圈外＋20%。',
    comparison:'团队零甲主武器DPS×1.92，高于指挥官×1.44；保留母巢近场生命特色，避免把25%被动漏算或乘两次。'
  },
  {
    id:'artanis',race:'protoss',name:'阿塔尼斯',effectName:'达拉姆圣盾',kind:'buff',radius:12,
    recipients:'范围内具有原生盾的永久战斗友军，含英雄与来源',anchorIds:['medivac.1','sentry.1'],
    stats:{maxShield:.60,shieldArmorFlat:10,armorFlat:6,damageReduction:.40},
    replacesRetainedTeamEffect:{kind:'nativeShieldProtection',oldRadius:8,oldDamageReduction:.30},
    after:'原生盾上限＋60%、盾护甲＋10、生命护甲＋6、承受敌伤降低40%；半径12。',
    retainedTeamEffects:[{kind:'actualNativeShieldHealing',radius:8,targets:7,shieldPerTargetI:560}],
    retained:'原30%保护并入并提高至40%，只算一次；原七体每体560 I/秒、范围8回盾和主动8秒冻结窗口保持。',
    comparison:'与新版光穹常驻属性＋开启25%守护作整套生存对照；40%保护不再乘一次旧30%。'
  },
  {
    id:'zeratul',race:'protoss',name:'泽拉图',effectName:'虚空裂隙',kind:'debuff',radius:10,
    recipients:'范围内可见、有视线的地空敌方战斗单位',anchorIds:['marauder.2','banshee.1','high_templar.2'],
    stats:{vulnerability:.60,armorReduction:.65,defenseReduction:.30},
    after:'受到武器伤害＋60%、正生命/盾护甲－65%、已有百分比减伤相对降低30%；半径10，Boss完整。',
    retainedTeamEffects:[],retained:'原实际主生命＋盾伤的50%回响、0.4秒延迟及主动0.25秒时序保持。',
    comparison:'破甲超过V级60%，弱化减伤超过女妖25%；易伤、破甲分别入正确通道，回响不再重复吃60%易伤。'
  },
  {
    id:'alarak',race:'protoss',name:'阿拉纳克',effectName:'高阶压制',kind:'debuff',radius:10,
    recipients:'范围内可见、有视线的地空敌方战斗单位',anchorIds:['marauder.1','sentry.2'],
    stats:{weaponSuppression:.45,attackSlow:.40,moveSlow:.45},bossControlScale:1,
    after:'敌武器伤害－45%、攻速－40%、移动－45%；半径10，Boss完整生效。',
    retainedTeamEffects:[],retained:'原至多20层力量和确认版斩击/冲击波保持，不牺牲友军制造增益。',
    comparison:'敌武器DPS剩33%，强于精英基准45.5%；力量层数不能再放大这组百分比。'
  },
  {
    id:'fenix',race:'protoss',name:'菲尼克斯',effectName:'净化武库',kind:'buff',radius:null,
    recipients:'全队永久机械战斗友军，含机械英雄与来源；实际子机通过母体继承一次',anchorIds:['marine.3','thor.1','carrier.3'],
    stats:{damage:.60,speed:.25,maxHp:.25,maxShield:.40,armorPct:.30,shieldArmorPct:.30,move:.25},
    after:'攻击＋60%、攻速＋25%、生命＋25%、原生盾＋40%、生命/盾护甲＋30%、移动＋25%；全队机械。',
    retainedTeamEffects:[],retained:'原第四击强化、真实破盾60%回盾/6秒超载/20秒冷却与模型材质保持。',
    comparison:'团队零甲主武器DPS×2.00；本体破盾超载只强化本人，不伪写为整队常驻翻倍。'
  },
  {
    id:'vorazun',race:'protoss',name:'沃拉尊',effectName:'暗影迟滞',kind:'debuff',radius:10,
    recipients:'范围内可见、有视线的地空敌方战斗单位',anchorIds:['marauder.1','sentry.2','high_templar.3'],
    stats:{attackSlow:.50,weaponSuppression:.30,moveSlow:.50},bossControlScale:1,
    after:'敌攻速－50%、武器伤害－30%、移动－50%；半径10，Boss完整生效。',
    retainedTeamEffects:[],retained:'原6秒隐匿/14秒周期/开火显形、有限静滞与Boss只减速规则保持。',
    comparison:'敌武器DPS剩35%；同时高于织网40%减攻速和监察者组合，不能用光环把Boss变成永久静滞。'
  },
  {
    id:'purifier_flagship',race:'protoss',name:'净化旗舰',effectName:'矩阵共鸣',kind:'buff',radius:null,
    recipients:'全队具有原生盾的永久战斗友军，含英雄与来源；实际子机通过母体继承一次',anchorIds:['marine.3','carrier.3'],
    stats:{damage:.30,speed:.50,maxHp:.25,maxShield:.50,armorPct:.30,shieldArmorPct:.40,move:.25},
    after:'攻击＋30%、攻速＋50%、生命＋25%、原生盾＋50%、生命护甲＋30%、盾护甲＋40%、移动＋25%；全队原生盾友军。',
    retainedTeamEffects:[{kind:'actualNativeShieldHealing',radius:8,targets:7,shieldPerTargetI:420}],
    retained:'原12架真实子机、付费补机、七体420 I/秒回盾、受伤子机超载及确认版小航母聚能粗束保持。',
    comparison:'团队零甲主武器DPS×1.95；光环收益经母体只传一次，不能给母舰捏造普通枪或额外子机。'
  }
];

export const stackingRules = [
  '同名/同身份光环取最强有效源。双生两体、重复候选记录、真实子机均不制造第二份来源；升级不留下旧阶副本。',
  '不同英雄的攻击、攻速、生命/原生盾、移动与百分比护甲在各自英雄层相加后只乘一次。保留旧团队被动加入同一英雄层；单个英雄不是只展示新数字。',
  '家族指挥层延续人族Commander：20%独立乘一次，同家族多个源取强。新的精英范围生命/原生盾项在精英范围层逐项取强后乘一次，不能将女王45%与护翼35%连乘；生命和盾可来自不同合法最强源。',
  '新精英非家族攻击/攻速增益与其他不同命名来源在该增益层相加后一次应用；同来源的进入/退出仅更新成员。精英行军移动项取最高，再与英雄移动层组合。不同命名固定护甲在既有百分比/1.15适配后相加，继承时不能再适配一次。',
  '正护甲降低逐项取最强：旧命中破甲、新范围破甲、英雄破甲不连乘，也不相加超过100%。生命/盾分别算，负护甲不被“破甲”反向加强。现有百分比减伤的弱化也取最强相对比例，免疫和独立有限屏障不被剥除。',
  '武器易伤：同名取强，不同命名相加后一次乘入直接武器伤害预算；原主包派生的回响/弹射按实际预算继承，不能再吃第二遍易伤。固定技能、DOT和百分比瘟疫不吃武器易伤。',
  '攻速降低沿现有英雄/精英/技能通道；每通道取强，同源范围/命中先合并取强，通道合成后保留已有最低10%攻击速率。武器降伤沿原英雄通道与精英通道各取强后一次结算；不偷偷添加新的总削弱上限或把旧人族削弱。',
  '新增光穹、引力护阵与阿塔尼斯的团队百分比保护按适用伤害类型取同保护通道最高值；阿塔尼斯旧30%被新40%替代。固定护甲仍分开生效，空巢实际伤害分担不是百分比保护层，原预算/反递归继续。',
  '再生类按实际缺血恢复，女王与尼亚德拉不同命名每秒百分比再生可相加；同名取强。受到治疗增益同类取强，只放大主动生命治疗，不放大百分比再生、吸血、生命储备或返航百分比维修。抑疗作用到最终实际生命治疗/吸血/百分比再生一次，不能产生负治疗。',
  '生命/盾上限进出光环保持各自损伤比例；不视为治疗、伤害、破盾、吸血、复活或战斗事件。原生盾上限为0的身体保持0；临时屏障与原生盾分账。',
  '友方只认活的永久战斗身体，工人/建筑/运输载具/临时召唤排除，永久英雄按生物/机械/原生盾/地空资格正常参与。拥有真实子机的母体先算，子机经母体继承一次，不再按子机世界坐标二次领取；本体自身能力仍按原所有权。',
  '局部范围统一沿现有边缘距离（来源半径至目标身体边缘）、同方/敌方及视线规则。敌方范围需要可见目标，不授予额外反隐；全队友方指挥不要求局部视线。离区/来源死亡即撤掉常驻项，已发出的有限命中状态依其原到期规则处理。',
  '百分比、半径、持续时间、冷却与目标数I–V固定；原固定伤害/治疗仍按既定1/1.35/1.70/2.05/2.40成长。这不是把20%按五阶累加成100%。英雄本体、主动固定包、确认版普攻/技能和Boss时序不由光环重算。'
];
