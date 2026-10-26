import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/t01-20261024/actions-r21-r2';
const report=JSON.parse(await fs.readFile(root+'/report.json','utf8'));
let review;try{review=JSON.parse(await fs.readFile(root+'/visual-review.json','utf8'));}catch{review={scope:'Individually inspected complete captured sequences, with open findings preserved. A reviewed entry is not a visual pass.',rows:[]};}
const observations=[
 [1,'enemy:elite:queen:skill','36帧及全视口已看。紫色虫后和空中目标/同点地面见证均可辨；0–2.5秒未见可分辨的胆汁预警或酸团，2.55秒地面目标出现受击生命条，但原生记录伤害为零。16秒无残留；零伤害与特殊胆汁画面缺失分开保留。',['T01-ENEMY-QUEEN-ZERO-SPECIAL','T01-ENEMY-SPECIAL-VISUAL'],true],
 [2,'enemy:elite:queen:skill-ground','36帧及全视口已看。对地分支0–2.5秒未见可分辨的胆汁预警/弹体，2.55秒目标生命条反馈；结算记录为零伤害。持续到16秒无技能残留。未认定正常战役必然出现此受控分支。',['T01-ENEMY-QUEEN-ZERO-SPECIAL','T01-ENEMY-SPECIAL-VISUAL'],true],
 [3,'enemy:elite:queen:auto-ability','36帧及全视口已看。病人侧约0.35秒出现橙红输血光焰，1.7秒明显消退、2秒后消失；原生治疗量/持续状态随证据保留。虫后自然移动，细节裁剪后段出界，已用完整视口核对其始终在画面内；16秒无治疗残留。',[],true],
 [4,'enemy:elite:lurker:skill','36帧已看。原生埋地身体可见，触发的是精英通用胆汁；未见清楚预警/酸团，2.55秒目标有受击和生命条，伤害记录非零。16秒仍为埋地静态，无技能残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [5,'enemy:elite:lurker:mode:lurker','38帧细节和完整视口均看。埋地体展开为完整身体后行走；接近旁观目标后又按原生9距离条件埋地，4秒末为埋地体。细节页约2.5秒后部分越裁剪，完整视口确认身体没有离开屏幕；不是强制锁形态场景。',[],true],
 [6,'enemy:elite:lurker:mode:lurker_burrowed','38帧已看。完整地表身体在约0.9–1.3秒收起/下沉，1.4秒起为埋地体，持续至4秒。姿态没有冻结在中间，原生隐形由天眼侦测保持可见。',[],false],
 [7,'enemy:elite:mutalisk:skill','36帧已看。空中飞龙翅膀持续运动；原生精英技能为胆汁，施放前未见可分辨预警/酸团，2.55秒地面见证有受击生命条并记录实际伤害。到16秒无残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [8,'enemy:elite:mutalisk:skill-air','36帧已看。施法飞龙、空中目标和同点地面见证均可辨；胆汁仍只伤地面，2.55秒地面见证反馈。未见清楚预警/酸团或落地爆炸，16秒无残留；空中目标并未被当作胆汁受伤证据。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [9,'enemy:elite:corruptor:skill','36帧已看。腐化者空中身体持续摆动，空中目标与同点地面见证均可辨。0–2.5秒未见胆汁弹体或落点预警，2.55秒地面见证受击生命条出现，16秒无技能残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [10,'enemy:elite:ultralisk:skill','36帧已看。雷兽向地面目标靠近并遮住部分目标身体，2.55秒目标受击条可见。该精英原生技能为通用胆汁，施放至落点未见独立胆汁画面，16秒无残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [11,'enemy:elite:zergling:skill','36帧已看。约0.65秒起向目标冲锋，0.85秒穿过目标并出现受击生命条；到1.55秒已越过目标，随后正常返身移动，16秒无拖尾残留。起跑前未见独立路线预警，保留可读性缺口，不把真实冲锋身体运动写成缺失。',['T01-ENEMY-SPECIAL-TELEGRAPH'],false],
 [12,'enemy:elite:hydralisk:skill','36帧已看。约0.85秒出现三枚浅黄绿扇形弹体，1.05秒目标受击，1.15–1.35秒越过目标，1.5秒后消失，至16秒无残留；蓄力阶段没有独立路线预警。',['T01-ENEMY-SPECIAL-TELEGRAPH'],false],
 [13,'enemy:elite:hydralisk:skill-air','36帧已看。三枚扇形弹体约0.85秒出现，1.05秒空中目标出现受击条，1.35秒剩尾端一枚、1.5秒后消失；弹体在接近地面高度飞行而命中空中目标，该高度关系另留问题，不凭受击条认定空中视觉对齐。',['T01-ENEMY-SPECIAL-TELEGRAPH','T01-ENEMY-FAN-AIR-HEIGHT'],false],
 [14,'enemy:elite:ravager:skill','36帧已看。破坏者保持原生身体动作，胆汁0–2.5秒没有可辨弹体或预警，2.55秒目标受击条出现，无独立酸液落点爆炸，16秒无残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [15,'enemy:boss:queen:skill','36帧已看。Boss虫后给左侧受伤友军治疗后自然行走，原生治疗记录已捕获；未看见与治疗对应的光焰/输血效果。身体与病人始终在取景范围，16秒无残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [16,'enemy:boss:queen:auto-ability','36帧已看。自动输血在左侧病人处0.35秒出现橙红光焰，0.8–1.35秒明显、1.7秒消退、2秒消失；虫后自然行走，16秒无特效残留。与Boss专属瞬时治疗分支分开核对。',[],false],
 [17,'enemy:boss:lurker:skill','36帧已看。埋地体在1.2秒前保持，1.25秒目标受击条出现，但没有三路地刺模型或独立预警；8秒后原生周期出地移动、14秒重新埋地，16秒无技能残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [18,'enemy:boss:lurker:form:lurker:skill','36帧细节和全视口均看。准备时为地表体，施法0.05–1.2秒显示埋地体，1.25秒恢复地表并有目标受击；未见三路地刺或预警。后续自然周期变形和移动；16秒身体已在视口顶部部分裁切，需要补充跟随取景，当前不作完整身体周期通过。',['T01-ENEMY-SPECIAL-VISUAL','T01-FIXTURE-FRAMING'],true],
 [19,'enemy:boss:lurker:mode:lurker','38帧已看。埋地体维持至0.2秒，0.3秒完整身体展开后向旁观者移动，1.8秒到达底部界面边缘但主体仍可辨，至4秒保持完整地表体。',[],false],
 [20,'enemy:boss:lurker:mode:lurker_burrowed','38帧已看。准备阶段的原生移动使地表体已在底部HUD后，0.3秒埋地后只见名称，主体被HUD遮挡；该记录只能证明夹具取景不足，必须重新居中后补测，不能认定埋地视觉通过。',['T01-FIXTURE-FRAMING'],false],
 [21,'enemy:boss:mutalisk:skill','36帧已看。1.05秒起三枚扇形弹体从飞龙下方近地面高度出现，1.25秒地面目标受击、1.55秒仍有尾端弹体，1.7秒后消失，16秒无残留。施法前没有独立预警，飞行施法体与弹体起点高度不对应。',['T01-ENEMY-SPECIAL-TELEGRAPH','T01-ENEMY-FAN-AIR-HEIGHT'],false],
 [22,'enemy:boss:mutalisk:skill-air','36帧已看。三枚扇形弹体在近地面高度飞行，1.25秒空中目标受击，1.7秒后弹体消失，16秒无残留。施法者及目标均在空中，弹道两端高度没有对应；蓄力阶段未见独立预警。',['T01-ENEMY-SPECIAL-TELEGRAPH','T01-ENEMY-FAN-AIR-HEIGHT'],false],
 [23,'enemy:boss:corruptor:skill','36帧已看。0–1.5秒没有独立落点预警，1.55秒目标脚下出现绿色旋转酸液，持续到5秒、6秒后消失，16秒无残留。腐化者10–12秒部分越过细节裁剪，需完整视口补核对。',['T01-ENEMY-SPECIAL-TELEGRAPH','T01-FIXTURE-FRAMING'],false],
 [24,'enemy:boss:ultralisk:skill','36帧已看。蓄力期身体持续动作，1.55秒起冲向目标，2.5秒越过目标，3秒回转、6秒后正常待机，到16秒没有拖尾残留。未见独立冲锋路线预警，身体运动完整可见。',['T01-ENEMY-SPECIAL-TELEGRAPH'],false],
 [25,'enemy:boss:zergling:skill','36帧已看。1.05秒起向目标冲锋、1.5秒命中反馈，2秒已经越过目标，5秒后返身，16秒无残留。起跑前未见独立路线预警。',['T01-ENEMY-SPECIAL-TELEGRAPH'],false],
 [26,'enemy:boss:roach:skill','36帧已看。Boss蟑螂身体动作可见，但施放前后没有对应的扇形喷吐/独立预警；1.05秒目标出现受击生命条，16秒无技能残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [27,'enemy:boss:hydralisk:skill','36帧已看。1.05秒出现五枚浅黄绿扇形弹体，1.25秒目标受击，1.55秒仍有两枚尾端弹体，1.7秒后消失，16秒无残留。起射前未见独立路线预警。',['T01-ENEMY-SPECIAL-TELEGRAPH'],false],
 [28,'enemy:boss:hydralisk:skill-air','36帧已看。五枚扇形弹体在地面附近飞行，1.25秒空中目标受击，1.7秒后弹体消失，16秒无残留。空中命中高度不对应，起射前未见独立预警。',['T01-ENEMY-SPECIAL-TELEGRAPH','T01-ENEMY-FAN-AIR-HEIGHT'],false],
 [29,'enemy:boss:ravager:skill','36帧已看。施放至1.5秒落点前未见胆汁弹体或落点预警，1.55秒目标受击生命条出现；没有可分辨的酸液命中爆炸，16秒无残留。',['T01-ENEMY-SPECIAL-VISUAL'],false]
 ,[30,"enemy:lord:queen:skill","36帧已看。金色虫后专属治疗触发后未见对应输血光焰；随后绕病人移动。10秒主体下缘被HUD遮住，需跟随取景补拍；16秒无治疗残留。",["T01-ENEMY-SPECIAL-VISUAL","T01-FIXTURE-FRAMING"],false],
 [31,"enemy:lord:queen:auto-ability","36帧已看。病人0.35秒出现橙红输血，0.8–1.35秒明显、1.7秒消退、2秒消失。虫后10秒下缘被HUD遮住，需补拍；16秒无治疗残留。",["T01-FIXTURE-FRAMING"],false],
 [32,"enemy:lord:queen:aura","32帧已看。狂热领主和受益者可见，3秒受益者移出范围，8秒结束。未见独立脉冲光环或受益标记，名称显示特性；原生增益及撤销另有记录。",["T01-ENEMY-AURA-VISUAL"],false],
 [33,"enemy:lord:queen:trait:carapace:skill","36帧已看。甲壳领主虫后专属治疗没有对应光焰；金色身体移到下方再返回，主体全程可辨，16秒无治疗残留。",["T01-ENEMY-SPECIAL-VISUAL"],false],
 [34,"enemy:lord:queen:trait:carapace:auto-ability","36帧已看。病人0.35秒出现橙红输血，1.7秒消退、2秒消失；虫后持续走动并返回，16秒无残留。",[],false],
 [35,"enemy:lord:queen:trait:carapace:aura","32帧已看。甲壳领主与受益者可辨，3秒受益者移出、8秒结束；未见独立甲壳光环或受益标记，只有名称区分。增益及撤销有原生状态证据。",["T01-ENEMY-AURA-VISUAL"],false],
 [36,"enemy:lord:queen:trait:regen:skill","36帧已看。再生领主虫后专属治疗未见光焰，10–12秒移动到HUD后且10秒只剩局部，需补拍；16秒返回可见且无治疗残留。",["T01-ENEMY-SPECIAL-VISUAL","T01-FIXTURE-FRAMING"],false],
 [37,"enemy:lord:queen:trait:regen:auto-ability","36帧已看。病人0.35秒出现橙红输血，1.7秒消退、2秒消失；虫后10–12秒移动到HUD后，需补拍。16秒身体返回且无治疗残留。",["T01-FIXTURE-FRAMING"],false],
 [38,"enemy:lord:queen:trait:regen:aura","32帧已看。再生领主与受益者可辨，3秒受益者移出范围，8秒结束；未见独立再生光环或周期治疗特效。原生治疗增量和移出后撤销另有记录。",["T01-ENEMY-AURA-VISUAL"],false]
 ,[39,"enemy:lord:lurker:skill","36帧已看。埋地潜伏者1.25秒造成目标受击反馈，但未见三路地刺或施法预警。8秒出地、14秒再埋地，16秒主体仍可辨，无技能残留。",["T01-ENEMY-SPECIAL-VISUAL"],false],
 [40,"enemy:lord:lurker:aura","32帧已看。狂热领主保持埋地，受益者3秒移出范围，8秒原生出地；没有独立光环/受益标记，名称特性可见。",["T01-ENEMY-AURA-VISUAL"],false],
 [41,"enemy:lord:lurker:form:lurker:skill","36帧已看。准备为地表体，0.05秒即显示埋地体，1.25秒命中时恢复地表，但没有三路地刺或预警。随后自然变形移动，14秒身体下缘被HUD遮挡，需补拍；16秒返回可见且无技能残留。",["T01-ENEMY-SPECIAL-VISUAL","T01-FIXTURE-FRAMING"],false],
 [42,"enemy:lord:lurker:mode:lurker","38帧已看。0–0.2秒为埋地体、0.3秒完整展开，此后朝旁观者行走，约1.8秒抵达HUD上缘；主体到4秒仍可辨，未卡在半展开状态。",[],false],
 [43,"enemy:lord:lurker:mode:lurker_burrowed","38帧已看。准备已因原生移动进入HUD后，0–0.2秒只露背部、0.3秒起埋地后仅名称可见；必须跟随居中补拍，不能认定完整变形视觉通过。",["T01-FIXTURE-FRAMING"],false],
 [44,"enemy:lord:lurker:trait:carapace:skill","36帧已看。甲壳领主埋地施法，1.25秒目标受击，但没有三路地刺或独立预警。8秒后出地行走、14秒再埋地，到16秒身体完整可辨且无技能残留。",["T01-ENEMY-SPECIAL-VISUAL"],false]
 ,[45,"enemy:lord:lurker:trait:carapace:aura","32帧已看。甲壳潜伏者保持埋地，受益者3秒移出范围、8秒原生出地；未见独立甲壳光环或受益标记，只有名称区分。",["T01-ENEMY-AURA-VISUAL"],false],
 [46,"enemy:lord:lurker:trait:carapace:form:lurker:skill","36帧已看。准备为完整地表体，0.05–1.2秒显示埋地体，1.25秒恢复地表并命中，但未见地刺或预警。后续周期变形行走，16秒身体顶部出视口，需跟随补拍。",["T01-ENEMY-SPECIAL-VISUAL","T01-FIXTURE-FRAMING"],false],
 [47,"enemy:lord:lurker:trait:carapace:mode:lurker","38帧已看。0–0.2秒埋地、0.3秒完整展开，此后向旁观者行走，1.8秒抵达HUD上缘，主体至4秒完整可辨，无半展开冻结。",[],false],
 [48,"enemy:lord:lurker:trait:carapace:mode:lurker_burrowed","38帧已看。准备时地表体已在HUD后，0–0.2秒仅背部可见，0.3秒埋地后仅名称可见至4秒；夹具取景失败，需补拍。",["T01-FIXTURE-FRAMING"],false],
 [49,"enemy:lord:lurker:trait:regen:skill","36帧已看。再生潜伏者埋地施法，1.25秒目标受击反馈，无三路地刺或独立预警。8秒出地、14秒再次埋地，16秒完整可辨且无技能残留。",["T01-ENEMY-SPECIAL-VISUAL"],false],
 [50,"enemy:lord:lurker:trait:regen:aura","32帧已看。再生潜伏者与病人可见，3秒病人移出范围，8秒原生出地；没有独立再生光环或周期治疗画面，治疗及撤销记录独立保留。",["T01-ENEMY-AURA-VISUAL"],false]
 ,[51,"enemy:lord:lurker:trait:regen:form:lurker:skill","36帧已看。准备为地表体，0.05–1.2秒显示埋地体，1.25秒恢复地表并命中，但没有三路地刺或独立预警。随后向左上和下方移动，6–12秒埋地、14–16秒出地；主体全程可辨，16秒无技能残留。",["T01-ENEMY-SPECIAL-VISUAL"],false],
 [52,"enemy:lord:lurker:trait:regen:mode:lurker","38帧已看。0–0.2秒埋地、0.3秒完整展开，此后向旁观者行走，1.8秒抵达HUD上缘，主体至4秒仍可辨，无半展开冻结。",[],false],
 [53,"enemy:lord:lurker:trait:regen:mode:lurker_burrowed","38帧已看。准备时地表体已部分藏在HUD后，0.3秒埋地后仅微小黄色尖端和名称可见，持续至4秒；需跟随居中补拍，不能认定完整变形通过。",["T01-FIXTURE-FRAMING"],false]
 ,[54,"enemy:lord:mutalisk:skill","36帧已看。狂热飞龙1.05秒在身体下方近地面高度发出三枚扇形弹体，1.25秒目标受击，1.7秒尚有尾弹、2秒消失，16秒无残留。未见独立蓄力预警，飞行身体与弹体起点高度不对应。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-ENEMY-FAN-AIR-HEIGHT"],false],
 [55,"enemy:lord:mutalisk:skill-air","36帧已看。狂热飞龙三枚扇形弹体从近地面飞行，1.25秒空中目标受击，1.7秒剩尾弹、2秒消失，16秒无残留。施放前无独立预警，弹道起点和空中目标高度均不对应。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-ENEMY-FAN-AIR-HEIGHT"],false],
 [56,"enemy:lord:mutalisk:aura","32帧已看。狂热飞龙持续绕受益者移动，3秒受益者移出范围、8秒结束；无独立光环或受益标记。约1.05–3.25秒身体部分越过视口上沿，需要补拍。",["T01-ENEMY-AURA-VISUAL","T01-FIXTURE-FRAMING"],false],
 [57,"enemy:lord:mutalisk:trait:carapace:skill","36帧已看。甲壳飞龙1.05秒出现三枚近地面扇形弹体，1.25秒目标受击、1.7秒尾弹可见、2秒消失，16秒无残留。没有独立预警，弹体起点低于飞行身体。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-ENEMY-FAN-AIR-HEIGHT"],false],
 [58,"enemy:lord:mutalisk:trait:carapace:skill-air","36帧已看。甲壳飞龙1.05秒发出三枚近地面弹体，1.25秒空中目标反馈，1.7秒尾弹、2秒消失，16秒无残留。起点与目标高度均未对齐，蓄力期无独立预警。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-ENEMY-FAN-AIR-HEIGHT"],false],
 [59,"enemy:lord:mutalisk:trait:carapace:aura","32帧已看。甲壳飞龙绕受益者飞行，3秒受益者移出范围；未见独立光环/受益标记。8秒主体越过视口顶部，仅部分身体和名称可见，需跟随补拍。",["T01-ENEMY-AURA-VISUAL","T01-FIXTURE-FRAMING"],false],
 [60,"enemy:lord:mutalisk:trait:regen:skill","36帧已看。再生飞龙1.05秒发出三枚近地面扇形弹体，1.25秒命中地面目标，1.7秒剩尾弹、2秒消失，16秒无残留。起点低于飞行身体，蓄力期未见独立预警。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-ENEMY-FAN-AIR-HEIGHT"],false],
 [61,"enemy:lord:mutalisk:trait:regen:skill-air","36帧已看。再生飞龙1.05秒发出三枚近地面弹体，1.25秒空中目标受击，1.7秒尾弹、2秒消失，16秒无残留。弹道两端高度不对应，蓄力期未见独立预警。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-ENEMY-FAN-AIR-HEIGHT"],false],
 [62,"enemy:lord:mutalisk:trait:regen:aura","32帧已看。再生飞龙绕病人飞行，3秒病人移出范围，未见独立再生光环或治疗画面。1.55–3秒靠近/部分越过顶部，8秒主体在HUD后仅露翅尖，需要跟随补拍。",["T01-ENEMY-AURA-VISUAL","T01-FIXTURE-FRAMING"],false]
 ,[63,"enemy:lord:corruptor:skill","36帧已看。狂热腐化者在1.55秒生成目标脚下的绿色酸液，随后脉冲变化，4秒尚有小片、5秒后消失，16秒无残留；此前无独立预警。3–5秒及14秒身体部分越过视口顶部，需补拍。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-FIXTURE-FRAMING"],false],
 [64,"enemy:lord:corruptor:aura","32帧已看。狂热腐化者绕受益者飞行，3秒受益者移出范围；没有独立光环/受益标记。1.5–3.25秒身体部分或全部超出顶部，需补拍。",["T01-ENEMY-AURA-VISUAL","T01-FIXTURE-FRAMING"],false],
 [65,"enemy:lord:corruptor:trait:carapace:skill","36帧已看。甲壳腐化者1.55秒生成绿色酸液，2–4秒周期变化，5秒后消失，16秒无残留；无独立蓄力预警。4秒身体逼近细节裁剪左边、10秒接近顶部，需完整取景补核对。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-FIXTURE-FRAMING"],false],
 [66,"enemy:lord:corruptor:trait:carapace:aura","32帧已看。甲壳腐化者绕受益者移动，3秒受益者移出范围，8秒结束；身体完整可辨，未见独立甲壳光环或受益标记。",["T01-ENEMY-AURA-VISUAL"],false],
 [67,"enemy:lord:corruptor:trait:regen:skill","36帧已看。再生腐化者1.55秒出现绿色酸液，2–4秒脉冲变化、5秒后消失，16秒无残留；无独立蓄力预警。10秒身体下缘被HUD遮挡，需补拍。",["T01-ENEMY-SPECIAL-TELEGRAPH","T01-FIXTURE-FRAMING"],false],
 [68,"enemy:lord:corruptor:trait:regen:aura","32帧已看。再生腐化者绕病人移动，3秒病人移出范围；8秒身体靠近HUD上缘但仍可辨。未见独立再生光环/周期治疗画面，原生状态证据另存。",["T01-ENEMY-AURA-VISUAL"],false],
 [69,"enemy:lord:ultralisk:skill","36帧已看。狂热雷兽蓄力时身体抬刀转动，1.55秒起冲锋，2.5秒越过目标，随后转身，6–16秒稳定待机；无技能残留，主体全程可辨。起跑前未见独立路线预警。",["T01-ENEMY-SPECIAL-TELEGRAPH"],false],
 [70,"enemy:lord:ultralisk:aura","32帧已看。狂热雷兽绕受益者移动，3秒受益者移出范围，未见独立光环/受益标记。1.2秒后顶部刀尖/身体部分出视口，8秒下缘被HUD遮住，需跟随补拍。",["T01-ENEMY-AURA-VISUAL","T01-FIXTURE-FRAMING"],false],
 [71,"enemy:lord:ultralisk:trait:carapace:skill","36帧已看。甲壳雷兽蓄力抬刀，1.55秒开始冲锋、2.5秒越过目标，回转后6–16秒待机；主体全程完整，无技能残留。起跑前无独立路线预警。",["T01-ENEMY-SPECIAL-TELEGRAPH"],false]
 ,[72,"enemy:lord:ultralisk:trait:carapace:aura","32帧已看。甲壳雷兽绕受益者移动，3秒受益者移出范围，未见独立光环/受益标记。1.7秒左侧身体越裁剪且近HUD，8秒上半身越过视口顶部，需补拍。",["T01-ENEMY-AURA-VISUAL","T01-FIXTURE-FRAMING"],false],
 [73,"enemy:lord:ultralisk:trait:regen:skill","36帧已看。再生雷兽蓄力抬刀，1.55秒冲出、2.5秒越过目标，回转后6–16秒待机；主体完整可辨，无技能残留。起跑前无独立路线预警。",["T01-ENEMY-SPECIAL-TELEGRAPH"],false],
 [74,"enemy:lord:ultralisk:trait:regen:aura","32帧已看。再生雷兽绕病人移动，3秒病人移出范围，无独立再生光环或周期治疗画面。8秒主体在HUD后仅露刀尖与名称，需补拍。",["T01-ENEMY-AURA-VISUAL","T01-FIXTURE-FRAMING"],false],
 [75,"enemy:lord:zergling:skill","36帧已看。狂热跳虫1.05秒起冲锋，1.55秒目标受击条出现、2秒已越过目标，6秒返回，16秒无残留，身体完整可辨。蓄力期无独立路线预警。",["T01-ENEMY-SPECIAL-TELEGRAPH"],false],
 [76,"enemy:lord:zergling:aura","32帧已看。狂热跳虫绕受益者移动，3秒受益者移出范围，8秒身体仍完整可辨；未见独立光环/受益标记。",["T01-ENEMY-AURA-VISUAL"],false],
 [77,"enemy:lord:zergling:trait:carapace:skill","36帧已看。甲壳跳虫1.05秒起冲锋，1.55秒目标受击、2秒越过目标，6秒返回，16秒无残留，身体完整。蓄力期没有独立路线预警。",["T01-ENEMY-SPECIAL-TELEGRAPH"],false],
 [78,"enemy:lord:zergling:trait:carapace:aura","32帧已看。甲壳跳虫绕受益者移动，3秒受益者移出范围，8秒主体仍在视口内；无独立光环或受益标记。",["T01-ENEMY-AURA-VISUAL"],false],
 [79,"enemy:lord:zergling:trait:regen:skill","36帧已看。再生跳虫1.05秒冲出，1.55秒命中反馈、2秒越过目标，6秒返回，16秒无残留，身体全程可辨。起跑前无独立路线预警。",["T01-ENEMY-SPECIAL-TELEGRAPH"],false],
 [80,"enemy:lord:zergling:trait:regen:aura","32帧已看。再生跳虫绕病人移动，3秒病人移出范围，未见独立再生光环或周期治疗画面。8秒身体进入HUD后仅名称可见，需跟随补拍。",["T01-ENEMY-AURA-VISUAL","T01-FIXTURE-FRAMING"],false]
 ,[81,'enemy:lord:roach:skill','36帧已看。狂热蟑螂施放前后没有对应喷吐或独立预警，1.05秒目标出现受击生命条；身体全程可辨，16秒无技能残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [82,'enemy:lord:roach:aura','32帧已看。领主及受益者完整可辨，3秒受益者移出范围，8秒身体接近HUD上沿仍完整；未见独立狂热光环或受益标记。',['T01-ENEMY-AURA-VISUAL'],false],
 [83,'enemy:lord:roach:trait:carapace:skill','36帧已看。甲壳蟑螂施放前后没有喷吐或独立预警，1.05秒目标出现受击生命条，身体完整；16秒无技能残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [84,'enemy:lord:roach:trait:carapace:aura','32帧已看。甲壳领主及受益者完整可辨，3秒受益者移出范围、8秒结束；没有独立光环或受益标记。',['T01-ENEMY-AURA-VISUAL'],false],
 [85,'enemy:lord:roach:trait:regen:skill','36帧已看。再生蟑螂施放前后没有喷吐或独立预警，1.05秒目标出现受击生命条，身体完整；16秒无技能残留。',['T01-ENEMY-SPECIAL-VISUAL'],false],
 [86,'enemy:lord:roach:trait:regen:aura','32帧已看。再生领主和病人可辨，3秒病人移出范围；未见独立再生光环或周期治疗画面。8秒身体贴近HUD且下肢难辨，列为取景补核对。',['T01-ENEMY-AURA-VISUAL','T01-FIXTURE-FRAMING'],false],
 [87,'enemy:lord:hydralisk:skill','36帧已看。狂热刺蛇1.05秒开始扇形射击，1.15秒多枚淡绿弹体可辨，1.25秒目标受击，1.55秒剩尾弹、1.7秒消失，16秒无残留。蓄力期间没有独立预警。',['T01-ENEMY-SPECIAL-TELEGRAPH'],false],
 [88,'enemy:lord:hydralisk:skill-air','36帧已看。多枚扇形弹体沿地面飞行，1.25秒空中目标受击，1.55秒剩尾弹、1.7秒消失，16秒无残留。弹道与空中命中高度不对应，施放前没有独立预警。',['T01-ENEMY-SPECIAL-TELEGRAPH','T01-ENEMY-FAN-AIR-HEIGHT'],false],
 [89,'enemy:lord:hydralisk:aura','32帧已看。狂热刺蛇绕受益者移动，3秒受益者移出范围，8秒身体接近HUD上沿仍完整可辨；未见独立光环或受益标记。',['T01-ENEMY-AURA-VISUAL'],false],
 [90,'enemy:lord:hydralisk:trait:carapace:skill','36帧已看。甲壳刺蛇1.05秒开始扇形射击，1.25秒目标受击，1.55秒尾弹可见、1.7秒消失，16秒无残留。蓄力期间没有独立预警。',['T01-ENEMY-SPECIAL-TELEGRAPH'],false],
 [91,'enemy:lord:hydralisk:trait:carapace:skill-air','36帧已看。甲壳刺蛇1.05秒发射近地面扇形弹体，1.25秒空中目标受击，1.55秒尾弹、1.7秒消失，16秒无残留。弹道高度不对应空中目标，施放前没有独立预警。',['T01-ENEMY-SPECIAL-TELEGRAPH','T01-ENEMY-FAN-AIR-HEIGHT'],false],
 [92,'enemy:lord:hydralisk:trait:carapace:aura','32帧已看。甲壳刺蛇绕受益者移动，3秒受益者移出范围，8秒返回上方；身体全程完整可辨，未见独立光环或受益标记。',['T01-ENEMY-AURA-VISUAL'],false]
 ,[93,'enemy:lord:hydralisk:trait:regen:skill','36帧已看。再生刺蛇1.05秒开始扇形射击，1.25秒目标受击，1.55秒尾弹可见、1.7秒消失，16秒无残留。蓄力期无独立预警。',['T01-ENEMY-SPECIAL-TELEGRAPH'],false],
 [94,'enemy:lord:hydralisk:trait:regen:skill-air','36帧已看。再生刺蛇1.05秒发射近地面弹体，1.25秒空中目标受击，1.55秒尾弹、1.7秒消失，16秒无残留。弹道不对应空中目标高度，施放前无独立预警。',['T01-ENEMY-SPECIAL-TELEGRAPH','T01-ENEMY-FAN-AIR-HEIGHT'],false],
 [95,'enemy:lord:hydralisk:trait:regen:aura','32帧已看。再生刺蛇绕病人移动，3秒病人移出范围；未见独立再生光环或周期治疗画面。8秒下肢贴近HUD边界，需居中补核对完整身体。',['T01-ENEMY-AURA-VISUAL','T01-FIXTURE-FRAMING'],false],
 [96,'enemy:lord:ravager:skill','36帧已看。狂热破坏者1.55秒造成目标受击反馈，但施放到命中均未见胆汁弹体、落点预警或酸液命中爆炸，16秒无残留。准备帧身体明显小于0.05秒后，需核查预览初始尺寸。',['T01-ENEMY-SPECIAL-VISUAL','T01-ENEMY-READY-SCALE'],false],
 [97,'enemy:lord:ravager:aura','32帧已看。准备帧身体明显偏小，0.05秒后变大；3秒受益者移出范围，无独立狂热光环或受益标记。8秒下半身被HUD遮挡，需补拍。',['T01-ENEMY-AURA-VISUAL','T01-ENEMY-READY-SCALE','T01-FIXTURE-FRAMING'],false],
 [98,'enemy:lord:ravager:trait:carapace:skill','36帧已看。甲壳破坏者1.55秒目标受击，但没有对应胆汁弹体、落点预警或爆炸，16秒无残留。准备帧身体明显小于0.05秒后，需核查初始尺寸。',['T01-ENEMY-SPECIAL-VISUAL','T01-ENEMY-READY-SCALE'],false],
 [99,'enemy:lord:ravager:trait:carapace:aura','32帧已看。准备帧身体明显偏小，0.05秒后变大；3秒受益者移出范围，没有独立甲壳光环或受益标记。8秒身体顶部接近/越过视口上沿，需补拍。',['T01-ENEMY-AURA-VISUAL','T01-ENEMY-READY-SCALE','T01-FIXTURE-FRAMING'],false],
 [100,'enemy:lord:ravager:trait:regen:skill','36帧已看。再生破坏者1.55秒目标受击，但未见胆汁弹体、落点预警或爆炸，16秒无残留。准备帧身体明显小于0.05秒后，需核查初始尺寸。',['T01-ENEMY-SPECIAL-VISUAL','T01-ENEMY-READY-SCALE'],false],
 [101,'enemy:lord:ravager:trait:regen:aura','32帧已看。准备帧身体明显偏小、0.05秒后变大；3秒病人移出范围，没有独立再生光环或周期治疗画面。8秒主体完全进入HUD后，需跟随补拍。',['T01-ENEMY-AURA-VISUAL','T01-ENEMY-READY-SCALE','T01-FIXTURE-FRAMING'],false]
];
for(const [number,id,observation,issues,full] of observations){
 const row=report.rows[number-1];assert.equal(row.id,id);assert.equal(row.status,'cycle-captured');
 const images=[];for(const sub of ['review-focus',...(full?['review-full']:[])]){const file=root+'/'+sub+'/'+row.directory+'.jpg';images.push({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});}
 const entry={id,condition:row.condition??'normal',images,observation,issues,status:'reviewed',at:new Date().toISOString()};const i=review.rows.findIndex(r=>r.id===id);if(i<0)review.rows.push(entry);else review.rows[i]=entry;
}
await fs.writeFile(root+'/visual-review.json',JSON.stringify(review,null,2));console.log(JSON.stringify({reviewed:review.rows.length,issues:review.rows.filter(r=>r.issues?.length).length}));
