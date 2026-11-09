/** The armor/shield part of one real hit. Callers own barriers, receipts and effects. */
export interface ArmorPacket {
 amount:number;armor:number;shield:number;shieldArmor:number;shieldBonus:number;
 minimum:number;penetration:number;reduction:number;shieldOnly:boolean;armorPaid:boolean;
}
export function resolveArmorPacket(p:ArmorPacket){
 let amount=p.amount,shield=p.shield;
 if(shield>0&&amount>0){
  const hit=Math.max(p.minimum,amount+p.shieldBonus-p.shieldArmor*(1-p.penetration))*p.reduction;
  const absorbed=Math.min(shield,hit);shield-=absorbed;
  amount=Math.max(0,(hit-absorbed)/p.reduction-p.shieldBonus);
 }
 const health=amount>0&&!p.shieldOnly?(p.armorPaid?amount:Math.max(p.minimum,amount-p.armor*(1-p.penetration)))*p.reduction:0;
 return {shield,health};
}
