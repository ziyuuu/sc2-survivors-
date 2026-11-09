import type {World} from '../../world';
import type {Entity} from '../../types';

/** Only squad members share the player's formation and tactical reservations. */
export function squadActor(u:Entity){
 return u.team==='player'&&u.hp>0&&!u.heldBy&&!u.mission&&!u.encounter&&!u.summonKind&&!u.temporary;
}
export function movementIntent(w:World,u?:Entity){
 return Math.hypot(w.input.x,w.input.z)>.01||w.order?.kind==='move'&&(!w.order.arrived||w.hasPendingMove(u?.id));
}
export function tacticalIntent(w:World,u:Entity){
 const moving=!!movementIntent(w,u),locked=u.mode==='siege'||u.modeTimer>0||!!u.nativeModeUntil||(u.stoppedUntil??0)>w.time||!!u.heldBy;
 return {moving,locked,mayPursue:squadActor(u)&&!moving&&!locked,command:w.order?.issuedAt??-1};
}
