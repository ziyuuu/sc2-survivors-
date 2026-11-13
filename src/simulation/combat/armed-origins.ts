import type {Fortification} from '../types';
/** Old saves identify this one executor by its legacy rank and lifetime. */
export function isG02Bunker(f:Fortification,legacyRank:number){return f.kind==='bunker'&&f.supportUntil!==undefined&&(f.supportOrigin?f.supportOrigin.cardId==='G02':legacyRank>0&&!!f.supportRank);}
