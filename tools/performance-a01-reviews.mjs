// A01 adjudications. Old report IDs and board task IDs are separate namespaces.
const doc=name=>'docs/project/'+name+'.md';
export const docs={
 old:'reports/local/performance-audit-review-20261019/全项目性能审计与问题总表.md',
 matrix:'reports/local/performance-audit-review-20261019/matrix-final.json',
 exclusions:'reports/local/performance-audit-review-20261019/matrix-final.json',
 opt:doc('PERFORMANCE_OPTIMIZATION_20261016'),
 equip:doc('EQUIPMENT_EFFECTS_PERFORMANCE_20261016'),
 s03:doc('PERFORMANCE_S03_L01_F03_20261019'),
 r01:doc('PERFORMANCE_R01_20261020'),
 r03:doc('PERFORMANCE_R03_20261020'),
 l02:doc('PERFORMANCE_L02_20261020'),
 l03:doc('PERFORMANCE_L03_20261020'),
 b01:doc('PERFORMANCE_B01_BASELINE_20261019'),
 b02:doc('PERFORMANCE_B02_SCENES_20261019'),
 oldLoad:doc('LOADING_OPTIMIZATION_20261012'),
 oldLoadVerify:doc('LOADING_OPTIMIZATION_VALIDATION_20261012'),
 sevenA:doc('MVP7A_LOADING_20261013'),
 sevenAVerify:doc('MVP7A_LOADING_VALIDATION_20261013'),
 cinema:doc('CINEMATIC_PRELOAD_VALIDATION_20261012'),
 pack:doc('PACKAGE_HYGIENE_20260927'),
 fixed:doc('FIXED_SCENE_PERFORMANCE_VALIDATION_20261006'),
 p6:doc('NEXT_ITERATION_P6_VALIDATION_20261006'),
 natural:doc('HERO_MAP_PERFORMANCE_20260930'),
 acceptance:doc('MVP5_ACCEPTANCE_NEXT_20261014'),
 loot:doc('LOOT_ELITES_20261019'),
 s07:doc('PERFORMANCE_S07_20261020'),
 f02:doc('PERFORMANCE_F01_F04_F02_20261020'),
 u01:doc('PERFORMANCE_U01_U03_20261020'),
 s05:doc('PERFORMANCE_S05_20261020'),
 u04:doc('PERFORMANCE_U04_20261020'),
 x04:doc('PERFORMANCE_X04_20261020'),
 s06:doc('PERFORMANCE_S06_20261020'),
 difficulty:doc('DIFFICULTY_R2_IMPLEMENTATION_20261016'),
};
export const reviews=new Map();
function add(id,status,conclusion,tasks,sources=[],references=[],next=''){
 if(reviews.has(id))throw Error('Duplicate adjudication '+id);
 reviews.set(id,{status,conclusion,tasks,sources,references:references.map(x=>docs[x]??x),next});
}
const src=(file,needle)=>({file,needle});
const world=needle=>src('src/simulation/world.ts',needle);
const renderer=needle=>src('src/render/scene/battle-renderer.ts',needle);
const session=needle=>src('src/app/run-session.ts',needle);
const fixed=()=>src('src/simulation/fixed-stepper.ts','advance(elapsed:number)');
const material=needle=>src('src/render/materials/unit-material-batch.ts',needle);
const player=needle=>src('src/render/effects/source/player.ts',needle);
const cache=needle=>src('src/assets/persistent-cache.ts',needle);
const http=needle=>src('src/assets/http-store.ts',needle);
const backend=(file,needle)=>src('tools/backend/'+file,needle);

add('SIM-002','已解决','原“无精英仍每次全表扫描”的机制已由H03候选源集合修复；同tick晋升/替换显式失效，生命、阵营、位置仍实时判定。S08又跳过无回血来源的受益者查询。本次既有回归覆盖同tick变化，不把源索引当整tick属性缓存或新增收益。',['H03','S08'],[src('src/simulation/combat/team-auras.ts','function potentialEliteSources'),src('src/simulation/combat/team-auras.ts','export function compositeEliteBuff')],['opt']);
add('SIM-017','保留现状','旧“精英/Boss累计加速到1tick”描述不适用当前R2：频率F在300秒后封顶1.2，通常精英30→25秒、Boss90→75秒，简单精英50秒；普攻攻速上限1.25。生命/伤害仍按原连续指数增长。单类别只留一个到期模板，满员失败1秒后重试；增长政策保持，长期自然压力交V02。',['D01','V02'],[src('src/data/enemy-tuning.ts','export const endlessFrequency'),src('src/data/enemy-tuning.ts','export function continuousEndlessGrowth'),world('private updateEndlessSpawns')],['difficulty']);
add('SIM-018','否定','普通无尽波不随wave编号无限加快：当前每轮60秒、4波，出生时刻0/15/30/45秒；数量预算前5分钟平滑增至1.2后封顶。旧240秒模板文字也不再作为当前波次描述（经济事件仍用四轮周期）。未修改当前调度。',['D01'],[src('src/data/endless.ts','export function endlessWaveTemplate'),src('src/data/endless.ts','function cumulativeThreat')],['difficulty']);
add('SIM-019','否定','updateEndlessSpawns每次仅对elite、boss各尝试一次，progress钳到1，pending保留原到期模板；失败后1秒重试，不用while补任意多个逾期Boss。普通ambient队列和战役specialPlan的循环是不同路径，集中补兵仍归D01。',['D01'],[world('private updateEndlessSpawns'),world('if(this.autoWaves)while(this.specialPlan')],['s06']);
add('SIM-023','否定','“全部敌人/效果永久不清理”不成立：普通死体超过1.5模拟秒清除，临时体、飞行物/区域及源效果各有生命周期；保留源池首实例/容量不是持续活跃泄漏。F02/F05已修的特定回收缺口仍单列，不能由此证明全部GPU终身无泄漏。',['V01'],[world('this.time-u.deadAt>1.5'),player('this.clock-m.lastUsed<2')],['s07','f02']);
add('FX-009','已解决','H01已按精确pose、攻击叠加、护盾、颜色/活动与幻影参数复用材质结果，静态轨道另有有界缓存；仍逐slot比较并标记变化。复用既有全材质数值证据，本次重跑数值回归通过；旧无context微基准不能代表当前本体或整场FPS。',['H01'],[material('const key=JSON.stringify([pose.clip'),material('private sample(')],['opt','equip']);
add('FX-010','否定','材质成本不全是曲线采样：当前还执行角色/层遍历、颜色转换、行写入和脏区比较。原profile的32.37%与sampleMaterialTrack约2.25%是旧特定场景，不转写成当前占比；现有精确缓存继续保留。',['H01'],[material('private sample('),material('for(const values of rows)')],['old','opt']);
add('FX-018','否定','原“Boss死后无限源特效泄漏”无证据成立。当前非loop请求超过sourceLife返回，结束通道超时删除，非首个闲置mesh超过2秒回收。F01治疗尾迹修复及F02资源回收证据分别沿用；本次源通道停止回归通过，未宣称自然全技能长期GPU验收。',['F01','F02','V01'],[player('request.age>sourceLife'),player('if(age>sourceLife(def))'),player('private releaseMesh')],['f02','x04']);
add('FX-019','待测','这是旧300单位聚合CPU观察，不是新增独立热点；原GLTF占位/无GPU与“初始300”边界保留。本轮B01/B02已有真实资源基线，X01–X04等有局部对照；最新组合的自然高密战斗与最终FPS尚未测，交V01/V02。',['B02','V01','V02'],[player('private play(')],['old','b01','b02','x04'],'最终组合按相同设备/种子同时记录CPU、GPU、帧间隔和模拟欠账。');
add('FX-021','证据口径','TSX辅助函数会改变旧测量绝对值，不能把其68/92ms写成发行版耗时；也不能据此否定bundled profile确认的粒子/材质热点。现有性能批次绑定独立构建，保留各自测量方式，A01不提供新的计时收益。',['B01','V01'],[player('private play(')],['old','b01']);
for(const [id,needle,explanation] of [
 ['SAVE-001','this.savedAt=readArchive(raw).savedAt','旧存档saveNow在提交成功后仍readArchive(raw)取savedAt；候选未移植。必须保持capture/时点/sequence及成功后发布语义。'],
 ['SAVE-003','async saveNow(){const raw=this.exportJSON()','旧存档saveNow仍先同步export再入串行队列，busy未合并后续导出；requestSave同task微任务合并仍有效，不能说每次死亡都存档。'],
 ['SAVE-009','async saveNow(){const raw=this.exportJSON()','旧真实IDB记录的事务总长不是连续主线程阻塞，33/50ms帧间隔也不是当前游戏FPS。这里只保留大历史风险及原证据，不重开存档优化。'],
 ['PST-001','prepareLoad(raw?:string)','旧文件导入预览与提交仍多次validateOnly，restoreRun在validateOnly返回前structuredClone；当前舰装入口拒绝旧存档，不能把旧路径的四次clone当普通入口成本。'],
])add(id,'延期',explanation+' 普通舰装入口memoryOnly，按用户约定留D05/MVP收尾。',['D05'],[session(needle),session('get memoryOnly()')],['old','loot']);
add('SAVE-002','延期','SaveRepository.commit与IndexedSaveBackend.commit均校验新档，备份轮转还校验旧current/backup；分散于异步流程，不能相加称一次连续阻塞。旧档优化只可复用已验证结果，不能削弱坏档拒绝/回滚；当前普通舰装局不走此路径，D05收尾处理。',['D05'],[src('src/persistence/save-repository.ts','async commit(raw:string)'),src('src/persistence/save-repository.ts','commit(raw:string){readArchive(raw)')],['old','loot']);
add('SAVE-004','否定','captureRun只选择存档DTO字段并复制配置、状态快照，并非structuredClone整个World/Three对象。完整clone位于restoreRun另一路；舰装内存局captureRun会拒绝。编码/校验的大历史成本留D05，旧错误归因不保留为待修机制。',['D05'],[world('captureRun():RunSnapshot'),src('src/simulation/persistence/run-fields.ts','export function selectRunData')],['old']);
add('SAVE-010','证据口径','LongTask未记录不能推出无卡顿：50ms检测阈值与16.67ms帧预算不同。旧IDB帧间隔反例、B01/B02帧时间及欠账口径保留；本次未重测自然帧率。',['B01','V01'],[fixed()],['old','b01']);
add('LOAD-001','不采纳','保留原prepareRosterAssets两key数组和调用顺序。源最终组合明确排除此微改：3000压力中位回退13.16%，无可靠普遍收益；旧30/300微秒差不作为当前加载优化。L01已采用的地图定义就绪优化是另一条DATA-001。',['L01'],[renderer('for(const key of [displayModelKey(u),this.modelKey(u)])')],['matrix','s03']);
add('LOAD-002','已解决','共享纹理按不可变URL缓存加载promise，返回独立wrapper共享Source，失败删除promise以支持重试；forget仅移除缓存引用，不关闭活动材质图像。既有加载修复及本次共享纹理回归通过，非所有资源内存有统一上界。',['H01','V01'],[src('src/render/materials/shared-textures.ts','async image(url:string)'),src('src/render/materials/shared-textures.ts','forget(urls:Iterable<string>)')],['oldLoad','l03']);
add('LOAD-003','已解决','当前颜色/深度key以实际生成shader/布局为依据，不再把无关资产身份当程序变体；本次material-program-cache回归通过。10月6被撤回的缓存key候选另属GATE-004，不混为同一补丁或重复收益。',['V01'],[material('programKey('),src('src/render/materials/posed-depth.ts','customProgramCacheKey')],['oldLoadVerify']);
add('LOAD-004','已解决','实际HDR目标下按8个mesh分组预热，保留最终完整光照链与GPU完成校验，已不按每个网格反复等待。L02补等待超时；同步驱动/首绘仍可长阻塞，不能由这条已修宣布加载无长帧。',['L02'],[renderer('pending.slice(i,i+8)'),renderer('private warmLightingFrame()')],['oldLoad','l02']);
add('LOAD-005','已解决','同一次姿态遍历产出骨骼与多个挂点，姿态间约8ms合作让步；24FPS样本与半精度矩阵/双精度挂点保留。复用7A的184模型/1656次构造精确对照；单姿态和驱动调用不可抢占。',['V01'],[src('src/render/units/sampled-poses.ts','function* samples('),src('src/render/units/sampled-poses.ts','export async function preparePoseDataAsync')],['sevenA']);
add('LOAD-007','待测','7A两侧曾出现缓存键数/命中异常，原根因仍未定位。当前按hash读回并验长度/SHA，L02超时降级、L03离线和页面重开不等于部署HttpAssetStore真实缓存复测；模拟缓存回归通过也不证明浏览器长期留存。单列A03。',['L03','A03'],[cache('async get(hash:string)'),http('const cached=await this.cache.get')],['sevenAVerify','l02','l03'],'真实部署清单路径下记录CacheStorage键、命中、重下载、estimate/persisted、刷新和跨版本复用。');
add('LOAD-008','证据口径','异步等待、同步API阻塞和GPU elapsed是不同指标。驱动工作可从日志查询转到uniform/纹理提交；不将API wall时间直接记为GPU耗时，不相加嵌套阶段。沿用R01真实GPU查询与L02分段记录。',['B01','R01','L02'],[renderer('this.renderer.compileAsync'),renderer('gl.clientWaitSync')],['sevenAVerify','r01','l02']);
add('LOAD-009','不采纳','旧细分中gl.finish约0.1ms，不能据单个API名称认定其为数十秒首用阻塞主因。当前最终warmLightingFrame仍执行完整链和finish；没有新的因果证据，本批不删正确性门禁。',['L02','V01'],[renderer('this.renderer.getContext().finish()')],['sevenA','l02']);
add('LOAD-010','不采纳','缩短开屏软窗的旧五对比较没有稳定总等待收益，点击到战斗等待均增加。保留当前后台调度及15秒软窗；L02只处理分段和等待恢复，没有采纳此候选。',['L02'],[src('src/app/background-preparation.ts','soft=start+Math.max(0,15000-navigationElapsed)')],['sevenA','l02']);
add('LOAD-011','不采纳','旧CPU-only后台候选改善菜单响应却增加总等待与backing storage，已拒绝。当前可选任务仍含GPU预热且与必需入口共享lane；不能标成已采用或重新借此宣称加载收益。',['L02'],[renderer('await this.warmPresentationBatches(()=>{},true)'),src('src/app/background-preparation.ts','async enter(')],['sevenA']);
add('LOAD-012','不采纳','旧同步合并采样候选第三对总等待回退约28秒，生产采用合作分片合并；保留相同输出算法及约8ms姿态间让步。本次不恢复同步候选，不把隔离CPU时间当总加载时间。',['L02'],[src('src/render/units/sampled-poses.ts','export async function preparePoseDataAsync')],['sevenA']);
add('LOAD-014','证据口径','旧单次71.71秒快样本在字节相同正式R2中未重现，不能挑最好值当稳定收益；原失败与波动保留。当前L02/L03也未证明总加载下降，本批无新加载计时。',['V01'],[],['cinema','l02','l03']);
add('LOAD-017','不采纳','旧GLB全bufferView细切估算反增12663696字节，自适应仅估省19348字节且未证实际加载收益；未纳入产品。保持当前完整原素材和分片共享，不把估算当交付减包，也不重做资源转换。',['D06'],[src('src/render/loaders/semantic-gltf.ts','GLTFLoader')],['pack']);
add('LOAD-019','否定','15秒是可选准备软窗、24是最多可选模型条目，不是跨设备响应时限或内存/军队上限。新job前的输入/帧成本检查不能抢占在途同步工作；当前单lane和L02超时保护保持。',['L02'],[src('src/app/background-preparation.ts','async opening('),renderer('const selectedModels=[...models].slice(0,24)')],['sevenA','l02']);
add('GATE-001','否定','早期首关或冻结诊断合格不能关闭自然后期/大型编队/完整内容性能。保留历史尾帧失败与后测未复现的区别；V01/V02最终组合仍开放。',['V01','V02'],[fixed()],['fixed','b01','b02']);
add('GATE-002','待测','旧第10/11关欠账失败是历史验收记录，原外部审计当时缺原始local；不能称本次已复现或已修。当前B01/B02与局部优化不是相同自然后期路线，V02补当前版本连续路线并记录欠账。',['V02'],[fixed()],['natural','b02'],'按当前三族代表路线覆盖后期和无尽，保留失败/欠账，不丢tick。');
add('GATE-003','已解决','10月6的静态规则表/实时实体遍历优化属于已合入历史基础；H03后来又加候选源集合。本次同tick晋升/转换/死亡回归通过，旧8.6%/15.9%不复写为本批或当前全场收益。',['H03'],[src('src/simulation/combat/team-auras.ts','function potentialEliteSources')],['fixed','opt']);
add('GATE-004','不采纳','10月6缓存程序key/跳空AnimatedBatch的特定组合曾更慢并撤回；不把历史候选称已合入。本轮F03修的是confirmed-hero SkillEffects空实例上传，机制与证据独立；当前正确GLSL程序key归LOAD-003。',['F03'],[src('src/render/effects/confirmed-hero/skill-effects.ts','if(b.count>0)')],['fixed','s03']);
add('GATE-005','否定','FixedStepper仅在下一步前检查预算（至少先执行一步），同步tick不可抢占；完整render也不受模拟预算硬限。累计欠账保留，显式reset单列discardedBacklog；12ms不是完整帧硬上界。',['B01','V01'],[fixed(),src('src/app/bootstrap.ts','new FixedStepper')],['b01']);
add('GATE-006','待测','当前自然高密与完整内容稳定60FPS尚未验收。三族累计片段、冻结场景和组件收益不能代替自然连续战役/无尽；最终组合V01、自然V02、实际输入/人类V03分开。',['V01','V02','V03'],[fixed()],['sevenAVerify','b01','b02','l03'],'按最终统一入口验证；未达标保留开放。');
add('GATE-007','待测','历史P6-V01自然大范围泛白尚未建立对应触发/持续时间的当前复现或修复证据。五图环境已获用户接受，不能外推为此战斗特效问题通过；已有轻量画面检查复用，V03只对该触发及后续变更补证。',['V03'],[],['fixed','acceptance'],'复现对应自然战斗事件；区分正常亮效与缺陷，避免重开五图内容验收。');
add('GATE-008','待测','旧P6自然80点大型编队三次超门槛仍是历史未通过；静止300敌或纯模拟局部收益不关闭它。V02按当前合法编队重测连续自然压力，记录实际人数/内容与帧尾/欠账。',['V02'],[fixed()],['p6','b02'],'当前版本自然大型编队证据，与受控300诊断分列。');
add('C02','已解决','S03已用稳定障碍几何快照复用追踪雷路径图，按位置/半径/活性、地形对象及阶段失效，并修复连续线段卡角。查尔旧360步停滞→第44步触发和动态边界证据沿用；这是行为修复加查询复用，不宣称路径逐点与旧版相同。',['S03'],[src('src/simulation/movement/mine-routing.ts','export function'),src('src/simulation/combat/tracking-mines.ts','mine')],['s03']);
add('C21','保留现状','普通steerGoal反向cost/闭集仍按当前目标计算；S03只优化专用追踪雷稳定图并修卡角。MapTerrain路线与无definition可见图分开；当前没有普通反向cost跨调用缓存的收益/失效证据，不再列为已实现。保留canStep/slide与控制锚点语义。',['S03','S07'],[src('src/simulation/movement/steering.ts','export function steerGoal'),src('src/simulation/movement/mine-routing.ts','export function')],['s03','s07']);
add('R01','已解决','H01已记录按RGBA行的脏范围，最多8段且低于整表25%时局部上传，否则全量；初始化/恢复仍全传，未提交脏范围保留到实际上传。旧“只要变化就永远整容量”不再适用。冻结场两侧上传相同、动态局部路径与既有证据分列。',['H01'],[material('flush(){'),material('restoreMaterialUploads')],['opt','equip']);
add('R02','已解决','H04以场景增删维护renderable集合供深度/阴影/接触复用；当前仍读取实时材质/可见性并在finally恢复替换。R03又减少暂停CPU展示准备，GPU完整pass保留。本次嵌套增删/换父节点/材料回归通过，未把GPU耗时记为已消除。',['H04','R03'],[src('src/render/scene/renderable-registry.ts','export class RenderableRegistry'),src('src/render/scene/scene-contact.ts','finally'),src('src/render/materials/posed-depth.ts','configure(root:THREE.Object3D)')],['opt','r03']);
add('R03','已解决','F03始终同步mesh.count（含归零），仅count>0才标记矩阵/颜色上传；未改成局部范围上传。实际WebGL空层稳态10次/97280字节→0，首次/清空/再现/扩容/上下文恢复保留；不使用旧六套微基准数字宣称当前完整帧收益。',['F03'],[src('src/render/effects/confirmed-hero/skill-effects.ts','if(b.count>0)')],['s03']);
add('R04','待测','fixed模式直接返回，活跃auto/cinematic仍收集mains/near并读HUD矩形；暂停已有快速返回。旧mainSet替换25实体中位慢32%、7对6慢，最终组合只撤回该hunk；不能据此否定所有cameraFrame候选。新方案需先测真实布局/调用频度，归A02，旧候选不搬回。',['A02'],[renderer('private cameraFrame()'),src('src/render/scene/camera-controller.ts','update(')],['matrix','exclusions','r03'],'同一World固定/auto/cinematic，普通与密集、宽窄视口；验证镜头/主体输出再决定是否优化。');
add('L01','待讨论','菜单仍按unit/hero/building/tech/ui/skill前缀预备跨族资源；旧167ID/65MB只属于旧清单，不作为当前清单数量。原始字节准备不等于全部图像/GPU已解码。分层预载会转移后续屏幕等待，仍交D04。',['D04'],[http('const ids=[...Object.keys(store.manifest.assets).filter'),src('src/assets/offline-pack.ts','const menuIds=')],['l02','l03'],'先比较当前标题依赖及进入后续界面的首用等待，再决定预载范围。');
add('L03','待讨论','当前racePreloadModels含本族完整普通/精英/英雄与虫族敌人，prepareRace仍准备无尽建筑/地图。完整预载成本存在但也避免增援首用等待；L02未缩范围，未经决定不删未来模型/效果。D04比较分阶段准备及首用成本。',['D04'],[src('src/app/race-preload.ts','export function racePreloadModels'),renderer('await this.prepareEndlessAssets(')],['l02'],'完整预载与阶段预载相同内容对照，并展示转移后的等待和恢复行为。');
add('L09','延期','微信manifest校验仍要求kairos，当前浏览器是campaign-five-v3；小游戏入口仍属旧硬件/资源预检，不能称五图完整可玩。此为平台适配缺口，D06另批处理，不影响本次浏览器审计推进。',['D06'],[src('src/platform/wechat/asset-cache.ts',"m.mapId!=='kairos'"),src('src/platform/wechat/game-session.ts','map.kairos'),src('src/platform/wechat/preflight.ts','预检')],['old']);
add('L10','延期','微信同步文件SHA/重复校验、按ID求和及hash→单ID淘汰仍在；同hash多别名的保护/清理存在条件性风险。当前未跑微信真机或当前五图闭包，不能把160MiB与全发行体积直接比较判失败。D06先补别名与活动集合语义/真机证据。',['D06'],[src('src/platform/wechat/asset-cache.ts','setActiveIds(ids:Iterable<string>)'),src('src/platform/wechat/asset-cache.ts','private makeRoom(')],['old']);
add('L11','延期','辅助build-online-demo仍取旧dist/web清单并重编当前src/main，未建立源码/资源同代验证；只是可达前置条件缺口，本次没生成错包。正式构建的SHA/回滚和各性能冻结输入证据独立保留；构建机成本归D06，最终交付V04须核同代。',['D06','V04'],[src('tools/build-online-demo.mjs',"const release=JSON.parse(await fs.readFile('dist/web/web-release.json'"),src('tools/build-online-demo.mjs',"entryPoints:['src/main.ts']")],['l03']);
add('L12','已解决','原外部只读环境1429文件缺件已由该审计恢复，不是当前产品缺陷。本次复用L03当前1874资产逐一SHA及真实Web/离线启动证据；两套数量对应不同清单，不把旧恢复说成本批新优化。',['V01'],[],['old','l03','reports/local/performance-l03-20261020/pack-proof-1/report.json']);
add('L13','证据口径','missingAssets只检查RUNTIME_ASSETS必需项的状态元数据，ASSETS还并入增量资源。空返回、预下载完成、真实字节通过和GPU-ready必须分开；本轮各批已有清单/请求/模型/GPU门禁证据，函数本身不改成万能完整性证明。',['B01','V01'],[src('src/assets/manifest.ts','export const missingAssets'),src('src/assets/manifest.ts','export const ASSETS')],['l02','l03']);
add('PG-017','延期','旧DTO校验仍遍历历史并核对交叉成员关系；它保护结构、幂等与恢复原子性，不能为性能删验证。仅MVP收尾D05可研究单次临时索引，当前舰装局不进入旧存档；本批不实施或启动存档实验。',['D05'],[src('src/simulation/persistence/run-fields.ts','export function validateRunData'),world('const data=structuredClone(snapshot)')],['old','loot']);
add('PG-018','保留现状','新局、下一关、转无尽重置边界有意不同：nextStage保合法战利品/生产历史，转无尽清战斗临时对象，新局清局状态；World身份和监听器保持。同页舰装继续另走memoryContinuation。L03换图/新局和R03继续证据可复用，最终恢复/实际输入仍V03。',['V03'],[world('commitEndlessTransition('),world('resetRun(difficulty:'),session('keepRun(){')],['r03','l03']);
add('PST-002','部分解决','当前普通舰装入口keepRun使用memoryContinuation保留同页World，已绕开编码/解码；H05及R03实际继续证据沿用。但starship禁用的旧存档分支仍readArchive(exportJSON())，不称所有入口已修，该余项归D05。',['H05','D05'],[session('keepRun(){'),session('get memoryOnly()')],['loot','r03']);
add('B01','延期','服务端metrics仍只缓存完成结果、批末整体invalidate；冷miss串行统计与同key并发合并候选尚未进入当前源码。外部PGlite/loopback候选不是生产数据库证据。D06需代表性数据、并发、隐私删除代际和连接池验证；非玩家战斗FPS。',['D06'],[backend('metrics.mjs','export async function metrics'),backend('repository.mjs','invalidate(){this.cache.clear();}')],['matrix']);
add('B02','延期','服务端先全量取stage JSON，再逐阶段产生K(K−1)/2组合，排序后slice500；输出上限不限制前置工作。保留完整分母和run去重，不能先LIMIT原始stage；D06补真实规模/执行计划，不把此源码候选当客户端热点。',['D06'],[backend('metrics.mjs','const stages=await q('),backend('metrics.mjs','function buildSummaries(')],['old']);
add('B03','延期','遥测批次仍在事务与同visitor锁内逐事件串行处理，重复事件也有前置会话工作。候选需保留授权复核、幂等、单调合并和删除墓碑；D06补DB负载。当前普通入口离线，不从SQL条数推算客户端卡顿。',['D06'],[backend('repository.mjs','accepted=[];for(const e of events)'),src('src/main.ts','startGame')],['old','u04']);
add('B04','延期','启动和每小时仍refreshDaily全窗口再维护，busy为进程内；/api/config等待ready，静态游戏服务独立。D06需测DB IO/锁、增量与多实例协调；保留即时隐私删除，不把维护估计成本当当前线上慢查询。',['D06'],[backend('service.mjs','async function maintain()'),backend('metrics.mjs','export async function refreshDaily')],['old']);
add('B05','延期','当前迁移已具事件主键、events_day_kind、runs_filters等索引；部分visitor/run/time、retention谓词仍待代表性EXPLAIN验证。不能称全无索引或盲加索引；真实数据库计划、写放大与收益归D06。',['D06'],[backend('migrations/001.sql','CREATE INDEX IF NOT EXISTS events_day_kind'),backend('migrations/001.sql','CREATE INDEX IF NOT EXISTS runs_filters')],['old']);
add('B06','延期','本地资源部署createGameServer在监听前逐文件同步SHA，PGlite只读重定向恢复含同步gunzip/写入；外部资源地址分支不同。是进程冷启成本，非逐玩家/逐帧。完整性门禁保持，D06独立测启动再评估流式预检。',['D06'],[src('tools/coze-web-server.mjs','if(!assetBaseUrl)for('),src('tools/start-coze.mjs','zlib.gunzipSync(buf)')],['old']);
add('B07','延期','静态server当前仍同步exists/stat并按200响应新建异步gzip流；gzip并非同步压缩。源实验曾回退/调整后纳入隔离组合，当前源码未合入，不能整包搬运。D06在冷缓存并发/编码/ETag/CORS相同语义下重测。',['D06'],[src('tools/coze-web-server.mjs','const stat=statSync(file)'),src('tools/coze-web-server.mjs','stream.pipe(createGzip({level:1}))')],['matrix','old']);
add('B08','延期','通用tools/serve.mjs仍readFile整文件再res.end，大离线HTML可带来服务进程Buffer峰值；专用性能服务和生产coze走流式，是不同路径。本批不启通用服务加载大HTML，不改历史工具；D06有实际使用需求时验证流式/背压。',['D06'],[src('tools/serve.mjs','res.end(await fs.readFile(file))'),src('tools/coze-web-server.mjs','const stream=createReadStream(file)')],['old']);
add('B09','延期','后台多数标签仍取完整metrics并innerHTML整表，cards/archive与CSV缺统一行数预算；busy防单页并发，部分500限额保留。D06单独处理分页/报表复用与导出预算，不能把管理页当玩家HUD。',['D06'],[backend('admin/app.js','async function load()'),backend('service.mjs','function tableCSV(')],['old']);
add('DATA-001','已解决','L01已抽出campaignDefinition缓存身份；后台isReady只取定义hash，不创建MapTerrain/扫高度。真正开局仍new独立RadialTerrain，避免共享可变stage/route。五图热检查高度读取5145600→0证据沿用，本次定义缓存/独立实例回归通过。',['L01'],[src('src/data/campaign-map.ts','export function campaignDefinition('),renderer('campaignDefinition(map)')],['s03']);

// Existing reviews whose unresolved sub-scope needs an explicit live destination.
add('SIM-008','待测','S05活动历史与U01显示资格已优化；真实draftContext仍动态投影族谱资格、去重精英目录，drawBossLoot先构建reinforcementPool。缺当前自然频度与局部成本，UI收益不能替代奖励生成证据；归A02，保持原顺序/RNG与购买/死亡即时资格。',['U01','S05','A02'],[src('src/simulation/expedition-economy.ts','export function draftContext'),src('src/simulation/progression/expedition-drafts.ts','export function drawBossLoot')],['u01','s05'],'记录商店/领取/批量死亡真实调用频度，比较稳定目录提取候选且核对奖励顺序/RNG。');
add('R06','部分解决','F02私有clone骨架/mixer清理已修并有12轮纹理42→0证据。屏外fortMixers仍按截断fortDt增量推进，R03只跳过合法静止CPU展示；直接停止或改绝对时间可能改变姿态。余下活跃屏外成本归A02，涉及动画取舍再交D02。',['F02','R03','A02','D02'],[src('src/render/scene/building-view-lifecycle.ts','export function releaseBuildingView'),renderer('for(const [id,mixer] of this.fortMixers)')],['f02','r03'],'先测正常可见/屏外据点，保增量时间、死亡/重入和恢复输出。');
add('R15','待测','旧英雄getter反复filter、Protoss beginFrame/舰队children查找仍可达，部分旧精英事件查找已由X02优化。旧stroke16384顶点/49152索引与batch容量仍会提前返回，SourceDrawBatch按需扩展是另一层。未证明自然达到旧层上限，也未覆盖全层提交/丢弃；归A02，不静默降低或扩改输出。',['X02','R01','A02'],[src('src/render/effects/confirmed-hero/controller.ts','get packets()'),src('src/render/effects/protoss-hero-effects.ts','beginFrame(){'),src('src/render/effects/protoss-hero-materials.ts','base+n*2>16384')],['r01'],'合法英雄组合记录submitted/dropped及CPU；容量边界/重入/恢复有证据后才决定是否优化。');
add('L06','部分解决','L03已约束可重建UI缓存并记录页面Blob/编码片/纹理估算与GC堆，活跃资源可恢复；没有实现跨版本CacheStorage预算。资源URL可为编码片释放后的唯一恢复来源，不能随意撤销。真实部署跨版本留存、hash共享和磁盘预算决策单列A03，页面11局不能关闭长期磁盘问题。',['L03','A03'],[cache("const CACHE='sc2-resource-bytes-v1'"),cache('async put('),http('private shared=new Map')],['l03'],'多release共享/新增hash、容量与重新下载实测，提出保护活动引用的预算；未批准前不驱逐。');

// Classify the remaining 100 inherited conclusions without re-labeling their tests.
export const inheritedStatuses={
 '证据口径':['LOAD-015'],
 '保留现状':['SIM-007','SIM-011','SIM-013','SIM-014','SIM-021','FX-007','FX-014','C12','C19','C24','C25','PG-019','PG-008','PG-020','PG-023','UI-006','UI-LAYOUT-001','UI-AUDIO-001','DATA-002'],
 '否定':['SIM-022','FX-016','UI-004','UI-005','UI-007','LOAD-013','LOAD-018'],
 '不采纳':['FX-011','FX-012','R10'],
 '部分解决':['SIM-009','SIM-015','SAVE-005','SAVE-006','SAVE-008','LOAD-006','R08','R11','L04','L07','UI-PREVIEW-001','FX-015'],
 '待讨论':['SIM-020'],
};
export const extraDestinations={
 'SIM-009':['D01'],'SIM-020':['D01'],'SIM-015':['V02'],
 'SAVE-005':['D03'],'SAVE-006':['D03'],'SAVE-008':['D03','D05'],
 'FX-011':['D02'],'R10':['D02'],'R11':['D02'],'R08':['D02'],
 'LOAD-006':['V01'],'L04':['V01'],'L07':['V01'],'UI-PREVIEW-001':['V01'],
 'FX-015':['V01'],
};
export const taskReportRefs={
 H01:['opt','equip'],H02:['opt','equip'],H03:['opt'],H04:['opt'],H05:['loot'],
 S03:['s03'],L01:['s03'],F03:['s03'],F01:['f02'],F02:['f02'],F04:['f02'],
 X01:[doc('PERFORMANCE_X01_X02_20261020')],X02:[doc('PERFORMANCE_X01_X02_20261020')],
 X03:[doc('PERFORMANCE_X03_20261020')],X04:['x04'],
 S01:[doc('PERFORMANCE_S01_S02_20261020')],S02:[doc('PERFORMANCE_S01_S02_20261020')],
 S04:[doc('PERFORMANCE_S04_20261020')],S05:['s05'],S06:['s06'],S07:['s07'],
 S08:[doc('PERFORMANCE_S08_20261020')],U01:['u01'],U03:['u01'],U04:['u04'],
 U02:[doc('PERFORMANCE_U02_WAREHOUSE_20261019')],F05:[doc('PERFORMANCE_F05_PROJECTION_CLEANUP_20261019')],
 R01:['r01'],R02:[doc('PERFORMANCE_R02_20261020')],R03:['r03'],L02:['l02'],L03:['l03'],
};
