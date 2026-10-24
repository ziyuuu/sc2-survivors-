import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

root=Path('reports/local/g03-economy-20261023')
data=json.loads((root/'analysis.json').read_text(encoding='utf-8'))
font=Path('C:/Windows/Fonts/msyh.ttc')
if font.exists():
    font_manager.fontManager.addfont(str(font))
    plt.rcParams['font.family']=font_manager.FontProperties(fname=str(font)).get_name()
plt.rcParams.update({'axes.unicode_minus':False,'font.size':10,'figure.facecolor':'white','axes.spines.top':False,'axes.spines.right':False})
out=root/'figures';out.mkdir(exist_ok=True)
races={'terran':'人族','zerg':'虫族','protoss':'星灵'}
diffs={'easy':'简单','normal':'普通','hard':'困难','hell':'地狱'}
colors={'terran':'#2675af','zerg':'#7549a2','protoss':'#d57f12'}

fig,ax=plt.subplots(figsize=(10,9))
ax.set_xlim(-.5,2.5);ax.set_ylim(11.5,-.5)
for i,(race,rname) in enumerate(races.items()):
    for j,(diff,dname) in enumerate(diffs.items()):
        y=i*4+j
        for x,q in enumerate([0,3,5]):
            row=next((r for r in data['current'] if r['race']==race and r['difficulty']==diff and r['quality']==q),None)
            if not row: color='#eee';text='未执行'
            elif row['issue']: color='#f8ddaa';text='控制器错误'
            elif row['stop']=='endless-six-minutes': color='#d5eadc';text='18关 + 无尽6分钟'
            elif row['stop']=='lost': color='#f0d5d5';text=f"第{row['stage']}关战败" if not row['endlessReached'] else f"无尽{row['endlessSeconds']/60:.1f}分钟战败"
            elif row['stop']=='step-count-censored' and (row.get('activeSpecialAtStop') or {}).get('kind')=='crossing': color='#f5e6c6';text=f"第{row['stage']}关横穿阻断\n入场越界，待修复"
            else: color='#e5e5e5';text=f"第{row['stage']}关截断" if not row['endlessReached'] else f"无尽{row['endlessSeconds']/60:.1f}分钟截断"
            ax.add_patch(plt.Rectangle((x-.46,y-.42),.92,.84,color=color))
            ax.text(x,y,text,ha='center',va='center',fontsize=9)
ax.set_xticks(range(3),['裸装','八槽蓝色属性装备','八槽橙色生存套装'])
ax.set_yticks(range(12),[rn+' · '+dn for rn in races.values() for dn in diffs.values()])
ax.tick_params(length=0);ax.xaxis.tick_top();ax.set_title('G03 · 连续生产模拟的36条路线',loc='left',pad=42,fontsize=16,weight='bold')
for s in ax.spines.values():s.set_visible(False)
fig.text(.13,.035,'固定种子529及本局ID；程序操作。完成、战败与工作量截断分别记录，不代表玩家胜率。',fontsize=9,color='#555')
fig.subplots_adjust(bottom=.09,top=.87,left=.2,right=.98);fig.savefig(out/'routes.png',dpi=170);plt.close(fig)

fig,axes=plt.subplots(2,1,figsize=(11,7),sharex=True)
for race,rn in races.items():
    row=next((r for r in data['current'] if r['race']==race and r['difficulty']=='easy' and r['quality']==3),None)
    if not row:continue
    stages=[s for s in row['stages'] if s['endWallet'] is not None]
    coords=[int(s['stage'].split(':')[1])+(18 if s['stage'].startswith('endless:') else 0) for s in stages]
    for ax,key in zip(axes,['minerals','gas']):
        ax.plot(coords,[s['endWallet'][key] for s in stages],marker='o',markersize=3,label=rn,color=colors[race])
for ax,label in zip(axes,['矿物余额','瓦斯余额']):
    ax.set_ylabel(label);ax.set_ylim(bottom=0);ax.axvline(18.5,color='#888',ls='--',lw=1);ax.grid(axis='y',alpha=.2)
axes[0].legend(ncol=3,frameon=False);axes[0].set_title('简单 · 八槽蓝装：各关收尾时的余额',loc='left',fontsize=16,weight='bold')
axes[1].set_xlabel('战役关数；19—24表示无尽第1—6轮')
fig.text(.12,.015,'战役取关间购买前，无尽取轮末；包含已到账奖励。不能只按余额评判整体资源是否过剩。',fontsize=9,color='#555')
fig.tight_layout(rect=[0,.045,1,1]);fig.savefig(out/'easy-blue-wallet.png',dpi=170);plt.close(fig)

fig,ax=plt.subplots(figsize=(13,5.5));width=.23
for index,level in enumerate([1,2,3]):
    values=[];zeros=[]
    for diff in diffs:
        rows=[r for r in data['bait'] if r['difficulty']==diff and r['level']==level]
        values.append([np.mean([r['bait']['counts'][k] for r in rows]) if rows else 0 for k in ['encounter','elite','horde']]);zeros.append(f"{sum(sum(r['bait']['counts'].values())==0 for r in rows)}/{len(rows)}")
    values=np.asarray(values);x=np.arange(4)+(index-1)*width;bottom=np.zeros(4)
    for j,(name,color) in enumerate([('特殊遭遇','#559bbb'),('额外精英','#cc9661'),('独立虫群','#806da4')]):
        ax.bar(x,values[:,j],width*.92,bottom=bottom,color=color,label=name if index==0 else None);bottom+=values[:,j]
    for xi,yi,zero in zip(x,bottom,zeros):ax.text(xi,yi+.035,str(level)+'级\n零触发 '+zero,ha='center',va='bottom',fontsize=8)
ax.set_xticks(range(4),list(diffs.values()));ax.set_ylabel('每个单关样本的实际触发数均值');ax.set_ylim(0,max(1.5,ax.get_ylim()[1]*1.25));ax.legend(ncol=3,frameon=False,loc='upper left');ax.grid(axis='y',alpha=.15)
ax.set_title('诱饵：实际通过安全窗口的额外内容',loc='left',fontsize=16,weight='bold')
fig.text(.1,.02,'每档9个条件样本（6／12／18关 × 三种子）；零触发按样本数表示。含实际战败，非长期出现概率。',fontsize=9,color='#555')
fig.tight_layout(rect=[0,.07,1,1]);fig.savefig(out/'bait-admissions.png',dpi=170);plt.close(fig)
print(json.dumps({'figures':3,'out':str(out)},ensure_ascii=False))
