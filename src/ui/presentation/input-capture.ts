/** Capture player input without altering simulation pause or existing orders. */
export function battleInputCapture():HTMLElement|null{
 if(typeof document==='undefined')return null;
 return [...document.querySelectorAll<HTMLElement>('[data-captures-battle-input]')].find(el=>!el.hidden&&el.getClientRects().length>0)??null;
}
export function focusableWithin(root:HTMLElement){return [...root.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[inert]'));}
export function trapTab(event:KeyboardEvent,root:HTMLElement){if(event.key!=='Tab')return;const items=focusableWithin(root);if(!items.length)return;const at=items.indexOf(document.activeElement as HTMLElement);if(event.shiftKey&&at<=0){event.preventDefault();items.at(-1)!.focus();}else if(!event.shiftKey&&(at<0||at===items.length-1)){event.preventDefault();items[0].focus();}}
