import * as T from 'three';
const poses=new WeakMap<T.Object3D,{bone:T.Object3D;base:T.Quaternion;aim:number}>();
const up=new T.Vector3(0,1,0);
/** Audit the native Stand A frame rather than guessing its bone-local yaw axis. */
export function preparePlanetaryTurret(root:T.Object3D){const bone=root.getObjectByName('Bldg_Terran_CommandCenter_Turret'),muzzle=root.getObjectByName('Ref_Weapon');if(!bone||!muzzle)return;root.updateMatrixWorld(true);const origin=bone.getWorldPosition(new T.Vector3()),tip=muzzle.getWorldPosition(new T.Vector3());poses.set(root,{bone,base:bone.quaternion.clone(),aim:Math.atan2(tip.x-origin.x,tip.z-origin.z)});}
export function resetPlanetaryTurret(root:T.Object3D){const p=poses.get(root);if(p)p.bone.quaternion.copy(p.base);}
export function orientPlanetaryTurret(root:T.Object3D,facing:number){const p=poses.get(root);if(!p?.bone.parent)return;root.updateMatrixWorld(true);const parent=p.bone.parent.getWorldQuaternion(new T.Quaternion()),axis=up.clone().applyQuaternion(parent.invert()),rotation=new T.Quaternion().setFromAxisAngle(axis,facing-p.aim);p.bone.quaternion.premultiply(rotation);root.updateMatrixWorld(true);}
