/** Portable save data, including shared Jobs/hit Sets and infinite timer sentinels.
 * Only the explicitly selected simulation DTO enters this codec, never World/Three objects. */
type Value=null|boolean|string|number|{ref:number}|{special:'infinity'|'-infinity'|'undefined'};
type Node={kind:'object';entries:[string,Value][]}|{kind:'array'|'set';items:Value[]}|{kind:'map';entries:[Value,Value][]};
export interface Graph {root:Value;nodes:Node[]}
export function encodeGraph(input:unknown):Graph {
 const nodes:Node[]=[],seen=new Map<object,number>();
 function value(v:unknown):Value {
  if(v===undefined)return {special:'undefined'};
  if(v===Infinity)return {special:'infinity'};if(v===-Infinity)return {special:'-infinity'};
  if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;
  if(typeof v!=='object'||v===null)throw Error('存档包含不可保存的值');
  const prior=seen.get(v);if(prior!==undefined)return {ref:prior};
  const ref=nodes.length;seen.set(v,ref);nodes.push({kind:'object',entries:[]});
  if(Array.isArray(v))nodes[ref]={kind:'array',items:v.map(value)};
  else if(v instanceof Map)nodes[ref]={kind:'map',entries:[...v].map(([k,n])=>[value(k),value(n)])};
  else if(v instanceof Set)nodes[ref]={kind:'set',items:[...v].map(value)};
  else {if(Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)throw Error('存档包含运行时对象');nodes[ref]={kind:'object',entries:Object.entries(v).map(([k,n])=>[k,value(n)])};}
  return {ref};
 }
 const root=value(input);return {root,nodes};
}
export function decodeGraph(graph:Graph):unknown {
 if(!graph||!Array.isArray(graph.nodes)||graph.nodes.length>200000)throw Error('存档结构无效');
 const objects=graph.nodes.map(n=>{switch(n?.kind){case 'object':return Object.create(null);case 'array':return [];case 'set':return new Set();case 'map':return new Map();default:throw Error('存档节点无效');}});
 function value(v:Value):any {
  if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;
  if(!v||typeof v!=='object')throw Error('存档值无效');
  if('ref' in v){if(!Number.isInteger(v.ref)||v.ref<0||v.ref>=objects.length)throw Error('存档引用无效');return objects[v.ref];}
  if('special' in v){if(v.special==='infinity')return Infinity;if(v.special==='-infinity')return -Infinity;if(v.special==='undefined')return undefined;}
  throw Error('存档值无效');
 }
 graph.nodes.forEach((n,i)=>{const out=objects[i];if(n.kind==='object'){for(const [k,v] of n.entries){if(typeof k!=='string'||['__proto__','constructor','prototype'].includes(k))throw Error('存档字段无效');out[k]=value(v);}}else if(n.kind==='map'){for(const [k,v] of n.entries)out.set(value(k),value(v));}else for(const v of n.items){if(n.kind==='set')out.add(value(v));else out.push(value(v));}});
 return value(graph.root);
}
export function checksum(text:string){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
