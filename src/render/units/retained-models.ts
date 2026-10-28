export type RetainedModel={key:string;lastUsed:number;pinned:boolean;resources:ReadonlyMap<object,number>};
/** Budget unique CPU arrays and decoded images held only by idle unit groups.
 * Shared data owned by a pinned group is not charged again to the idle cache.
 * This is a deterministic cache estimate, never a process/GPU memory reading. */
export function retainedUnitEvictions(models:readonly RetainedModel[],high:number,low:number){
 const pinned=new Set<object>();for(const model of models)if(model.pinned)for(const resource of model.resources.keys())pinned.add(resource);
 const idle=models.filter(m=>!m.pinned).sort((a,b)=>a.lastUsed-b.lastUsed||a.key.localeCompare(b.key));
 const bytes=(rows:typeof idle)=>{const unique=new Map<object,number>();for(const row of rows)for(const [resource,size]of row.resources)if(!pinned.has(resource))unique.set(resource,size);return [...unique.values()].reduce((n,size)=>n+size,0);};
 const before=bytes(idle),evicted:string[]=[];let after=before;
 if(before>high)while(idle.length&&after>low){evicted.push(idle.shift()!.key);after=bytes(idle);}
 return {before,after,evicted};
}
