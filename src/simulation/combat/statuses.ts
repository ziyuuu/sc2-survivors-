export type StatusKind='bleed'|'corruption'|'acidArmor'|'neural'|'bloodlust';
export interface CombatStatus {id:number;target:number;source:number;kind:StatusKind;value:number;startsAt:number;until:number}

/** Simulation-time statuses. Refreshing one source does not stack it with itself. */
export class CombatStatuses {
 private byTarget=new Map<number,Map<string,CombatStatus>>();
 private expiry:{id:number;target:number;until:number}[]=[];
 private serial=0;
 snapshot(){return {serial:this.serial,entries:[...this.byTarget.values()].flatMap(entries=>[...entries.values()])};}
 restore(snapshot:{serial:number;entries:CombatStatus[]}){if(!snapshot||!Number.isSafeInteger(snapshot.serial)||!Array.isArray(snapshot.entries))throw Error('状态存档无效');this.byTarget.clear();this.expiry=[];this.serial=snapshot.serial;for(const status of snapshot.entries){if(!['bleed','corruption','acidArmor','neural','bloodlust'].includes(status.kind)||!Number.isFinite(status.until)||!Number.isFinite(status.value))throw Error('状态存档无效');let entries=this.byTarget.get(status.target);if(!entries)this.byTarget.set(status.target,entries=new Map());entries.set(this.key(status.kind,status.source),status);this.push({id:status.id,target:status.target,until:status.until});}}
 get count(){let n=0;for(const entries of this.byTarget.values())n+=entries.size;return n;}
 private key(kind:StatusKind,source:number){return kind+':'+source;}
 apply(target:number,source:number,kind:StatusKind,value:number,seconds:number,now:number){
  let entries=this.byTarget.get(target);if(!entries)this.byTarget.set(target,entries=new Map());
  const key=this.key(kind,source),status:CombatStatus={id:++this.serial,target,source,kind,value,startsAt:now,until:now+seconds};entries.set(key,status);
  this.push({id:status.id,target,until:status.until});return status;
 }
 value(target:number,kind:StatusKind,now:number){let strongest=0;for(const status of this.byTarget.get(target)?.values()??[])if(status.kind===kind&&status.until>now)strongest=Math.max(strongest,status.value);return strongest;}
 list(target:number,now:number){return [...(this.byTarget.get(target)?.values()??[])].filter(s=>s.until>now);}
 removeTarget(target:number){this.byTarget.delete(target);}
 tick(now:number){while(this.expiry.length&&this.expiry[0].until<=now){const top=this.pop()!,entries=this.byTarget.get(top.target);if(!entries)continue;for(const [key,status] of entries)if(status.id===top.id&&status.until<=now)entries.delete(key);if(!entries.size)this.byTarget.delete(top.target);}}
 private push(item:{id:number;target:number;until:number}){const a=this.expiry;let i=a.length;a.push(item);while(i>0){const p=(i-1)>>1;if(a[p].until<=item.until)break;a[i]=a[p];i=p;}a[i]=item;}
 private pop(){const a=this.expiry;if(!a.length)return;const first=a[0],last=a.pop()!;if(a.length){let i=0;while(true){let child=i*2+1;if(child>=a.length)break;if(child+1<a.length&&a[child+1].until<a[child].until)child++;if(a[child].until>=last.until)break;a[i]=a[child];i=child;}a[i]=last;}return first;}
}
