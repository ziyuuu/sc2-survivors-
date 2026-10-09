import type {VisualEvent} from '../../src/simulation/types';
/** Read-only diagnostic collector. Serial ordering survives World event-ring truncation. */
export class EventCollector{
 readonly history:VisualEvent[]=[];readonly kinds=new Map<number,Set<string>>();lastSerial=0;
 record(events:readonly VisualEvent[]){for(const e of events)if(e.serial>this.lastSerial){this.lastSerial=e.serial;this.history.push({...e});const kinds=this.kinds.get(e.entityId)??new Set<string>();kinds.add(e.kind);this.kinds.set(e.entityId,kinds);}if(this.history.length>10000)this.history.splice(0,this.history.length-10000);}
 reset(){this.history.length=0;this.kinds.clear();this.lastSerial=0;}
}
