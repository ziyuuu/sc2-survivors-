/** Headless V2 rule primitives. All numeric unit/building stats must be injected.
 * This is NOT a full SC2 combat engine and is NOT integrated into archived V1.
 */
const finite = (value, label, minimum = 0) => {
  if (!Number.isFinite(value) || value < minimum) throw new TypeError(`${label} must be finite and >= ${minimum}`);
  return value;
};
const positive = (value, label) => { finite(value, label); if (!value) throw new TypeError(`${label} must be > 0`); return value; };
function validateWallet(wallet) { finite(wallet.minerals, 'minerals'); finite(wallet.gas, 'gas'); }
function validateCost(cost) { finite(cost.minerals, 'cost.minerals'); finite(cost.gas, 'cost.gas'); }
export function canAfford(wallet, cost) {
  validateWallet(wallet); validateCost(cost);
  return wallet.minerals >= cost.minerals && wallet.gas >= cost.gas;
}
export function spend(wallet, cost) {
  if (!canAfford(wallet, cost)) return false;
  wallet.minerals -= cost.minerals; wallet.gas -= cost.gas; return true;
}
export function purchaseBuilding(wallet, definition, id) {
  if (!id || !definition.id) throw new TypeError('Building IDs required');
  finite(definition.buildSeconds, 'buildSeconds');
  if (!Array.isArray(definition.supportedTypes) || !definition.supportedTypes.length ||
      definition.supportedTypes.some(type => typeof type !== 'string' || !type))
    throw new TypeError('A building requires valid supported unit types');
  if (!spend(wallet, definition.cost)) return null;
  return { id, type: definition.id, constructionRemaining: definition.buildSeconds,
    supportedTypes: [...definition.supportedTypes], job: null, sequence: 0 };
}
export function startTraining(building, wallet, definition, capacityAvailable = true) {
  positive(definition.trainSeconds, 'trainSeconds'); validateCost(definition.cost);
  if (!capacityAvailable || building.constructionRemaining > 0 || building.job ||
      !building.supportedTypes.includes(definition.id)) return false;
  if (!spend(wallet, definition.cost)) return false;
  building.sequence += 1;
  building.job = { id: `${building.id}:${building.sequence}`, unitType: definition.id,
    remaining: definition.trainSeconds, paidCost: { ...definition.cost } };
  return true;
}
/** `now` is the beginning of this simulation step. All clock units are seconds. */
export function tickProduction(buildings, dt, now, paused = false) {
  finite(dt, 'dt'); finite(now, 'now');
  if (paused) return [];
  const events = [];
  for (const building of buildings) {
    if (building.constructionRemaining > 0) {
      building.constructionRemaining = Math.max(0, building.constructionRemaining - dt);
      continue;
    }
    if (!building.job) continue;
    const job = building.job;
    const completionOffset = job.remaining;
    job.remaining -= dt;
    if (job.remaining <= 1e-9) {
      events.push({ id: `pod:${job.id}`, type: 'spawn-rescue-pod', unitType: job.unitType,
        buildingId: building.id, producedAt: now + Math.max(0, completionOffset) });
      building.job = null;
    }
  }
  return events;
}
export function createPod(event, hp, guardianIds) {
  positive(hp, 'pod hp'); finite(event.producedAt, 'producedAt');
  if (!Array.isArray(guardianIds) || !guardianIds.length) throw new TypeError('A pod requires an active guardian group');
  return { id: event.id, unitType: event.unitType, hp, maxHp: hp,
    spawnedAt: event.producedAt, expiresAt: event.producedAt + 30,
    guardianIds: [...guardianIds], status: 'under-attack', resultDelivered: false };
}
export function damagePod(pod, amount) {
  finite(amount, 'damage');
  if (pod.status !== 'under-attack') return;
  pod.hp = Math.max(0, pod.hp - amount);
  if (!pod.hp) pod.status = 'destroyed';
}
export function resolvePod(pod, now, aliveGuardianIds, playerInReach) {
  finite(now, 'now');
  if (pod.resultDelivered) return null;
  if (pod.status === 'under-attack') {
    if (pod.hp <= 0) pod.status = 'destroyed';
    else if (now >= pod.expiresAt) pod.status = 'expired';
    else if (now >= pod.spawnedAt && playerInReach &&
        !pod.guardianIds.some(id => aliveGuardianIds.has(id))) pod.status = 'rescued';
  }
  if (pod.status === 'under-attack') return null;
  pod.resultDelivered = true;
  return { id: pod.id, status: pod.status, unitType: pod.unitType,
    grantReinforcement: pod.status === 'rescued' };
}
function validUnit(unit) {
  finite(unit.hp, 'unit.hp'); positive(unit.maxHp, 'unit.maxHp'); finite(unit.armor, 'unit.armor');
  if (!Array.isArray(unit.attributes)) throw new TypeError('Unit attributes required');
}
export function applyWeaponHit(target, weapon) {
  validUnit(target); finite(weapon.damage, 'weapon.damage'); finite(weapon.minimumDamage, 'minimumDamage');
  if (!Number.isInteger(weapon.hits) || weapon.hits < 1) throw new TypeError('Positive integer weapon.hits required');
  let bonus = 0;
  for (const entry of weapon.bonuses ?? []) {
    finite(entry.amount, 'bonus');
    if (target.attributes.includes(entry.attribute)) bonus += entry.amount;
  }
  if (!target.hp) return { damage: 0, killed: false };
  const perHit = Math.max(weapon.minimumDamage, weapon.damage + bonus - target.armor);
  const before = target.hp;
  for (let hit = 0; hit < weapon.hits && target.hp > 0; hit++) target.hp = Math.max(0, target.hp - perHit);
  return { damage: before - target.hp, killed: target.hp === 0, killedId: target.hp === 0 ? target.id : null };
}
export function tryFire(shooter, target, weapon, now, edgeDistance, moving = false) {
  finite(now, 'now'); finite(edgeDistance, 'distance'); positive(weapon.period, 'weapon.period');
  finite(weapon.range, 'weapon.range');
  if (shooter.hp <= 0 || target.hp <= 0 || now < (shooter.nextAttackAt ?? 0) ||
      edgeDistance > weapon.range || edgeDistance < (weapon.minimumRange ?? 0) ||
      (moving && !weapon.canMoveAndFire)) return null;
  if (target.flying && weapon.targetLayer === 'ground') return null;
  if (!target.flying && weapon.targetLayer === 'air') return null;
  shooter.nextAttackAt = now + weapon.period;
  return { type: 'weapon-launch', shooterId: shooter.id, targetId: target.id, weaponId: weapon.id, at: now };
}
/** Rates and costs are injected by the SC2 data adapter, never guessed here. */
export function healBiological(healer, target, rule, dt, edgeDistance) {
  validUnit(target); finite(dt, 'dt'); finite(edgeDistance, 'distance');
  finite(healer.energy, 'energy'); positive(rule.hpPerSecond, 'hpPerSecond');
  positive(rule.energyPerHp, 'energyPerHp'); finite(rule.range, 'heal range');
  if (healer.hp <= 0 || target.hp <= 0 || healer.owner !== target.owner ||
      !target.attributes.includes('Biological') || target.hp >= target.maxHp || edgeDistance > rule.range) return 0;
  const healed = Math.min(rule.hpPerSecond * dt, target.maxHp - target.hp, healer.energy / rule.energyPerHp);
  target.hp += healed; healer.energy = Math.max(0, healer.energy - healed * rule.energyPerHp);
  return healed;
}
export function drawThree(pool, eligible, rng = Math.random) {
  const candidates = pool.filter(eligible);
  if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw new Error('Duplicate card IDs');
  if (candidates.length < 3) throw new Error('At least 3 eligible cards required; add explicit resource fallbacks');
  const options = [];
  for (let i = 0; i < 3; i++) {
    const r = rng();
    if (!Number.isFinite(r) || r < 0 || r >= 1) throw new Error('RNG out of range');
    options.push(candidates.splice(Math.floor(r * candidates.length), 1)[0]);
  }
  return { options, claimed: null, rerolls: 0 };
}
export function rerollThree(offer, pool, eligible, wallet, cost, rng = Math.random) {
  if (offer.claimed !== null || !canAfford(wallet, cost)) return false;
  const replacement = drawThree(pool, eligible, rng);
  spend(wallet, cost);
  offer.options = replacement.options; offer.rerolls += 1;
  return true;
}
export function claimOne(offer, id) {
  if (offer.claimed !== null) return null;
  const choice = offer.options.find(c => c.id === id);
  if (!choice) return null;
  offer.claimed = id;
  return choice;
}
