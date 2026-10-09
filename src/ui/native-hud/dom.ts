/** Avoid replacing text nodes or assigning style when the displayed value is unchanged. */
export function text(node:Element,value:string){if(node.textContent!==value)node.textContent=value;}
export function attr(node:Element,name:string,value:string){if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
export function style(node:HTMLElement,name:string,value:string){if(node.style.getPropertyValue(name)!==value)node.style.setProperty(name,value);}
/** Retain existing interactive nodes across roster arrivals, deaths and pagination. */
export function reconcile(parent:HTMLElement,keys:readonly string[],create:(key:string)=>HTMLElement){
 const existing=new Map([...parent.children].map(el=>[(el as HTMLElement).dataset.hudKey!,el as HTMLElement]));
 let position=parent.firstElementChild;
 for(const key of keys){const node=existing.get(key)??create(key);node.dataset.hudKey=key;existing.delete(key);if(node!==position)parent.insertBefore(node,position);position=node.nextElementSibling;}
 for(const node of existing.values())node.remove();
}
