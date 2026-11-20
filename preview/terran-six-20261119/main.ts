import '../../src/ui/presentation/building-panel.css';
import '../../src/ui/presentation/game-shell.css';
import '../../src/render/scene/battle-distress.css';
import '../../src/ui/presentation/world-labels.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import '../../src/ui/hud/special-stages.css';
import {boot} from '../../src/app/bootstrap';
import {TERRAN_SIX} from '../../src/simulation/combat/terran-six';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {applyDisplayPreferences} from '../../src/ui/display-preferences';
import {finishOpening} from '../../src/ui/presentation/opening';
import {starshipImage} from '../../src/ui/starship/runtime-art';

async function openTrial() {
  const seed = 191145;
  applyDisplayPreferences();
  const {world, hud, readiness} = await boot({
    seed,
    equipmentAccount: newEquipmentAccount(seed),
    uiValidation: true,
    starship: {resolveImage: starshipImage},
  });

  world.missions.enabled = false;
  world.encounters.enabled = false;
  if (!world.start()) throw Error('试玩战局未能开始');
  world.stage = 12;
  world.entities.clear();
  world.expedition.ledger = [];
  world.pods = [];
  for (const group of world.expedition.building!.groups) group.enabled = false;

  // The isolated trial puts all six families on the field for one opening.
  world.expedition.familySlots = [...TERRAN_SIX];
  const {x, z} = world.anchor;
  TERRAN_SIX.forEach((family, index) => {
    world.expedition.tech['unlock.' + family] = 1;
    const row = index < 3 ? 0 : 1;
    const member = world.addUnit(family, 'terran', x + (index % 3 - 1) * 2.4, z - row * 2.8, 3);
    member.energy = member.maxEnergy;
  });
  const targets = [
    ['queen', 0, 4], ['ravager', -1.7, 4.6], ['roach', 1.6, 4.8],
    ['roach', -2.4, 5.7], ['roach', 2.6, 5.8], ['mutalisk', -3.7, 5], ['mutalisk', 3.7, 5],
  ] as const;
  for (const [type, dx, dz] of targets) {
    const enemy = world.addUnit(type, 'zerg', x + dx, z + dz, 3);
    enemy.hp = enemy.maxHp = 16000;
    enemy.armor = 5;
    enemy.stoppedUntil = world.time + 90;
    enemy.weaponDamage *= .35;
    if (type === 'queen') {
      enemy.enemyTier = 'boss';
      enemy.specialDamageMultiplier = .2;
    }
  }
  hud.update();
  await readiness.prepare('reinforcement', {campaignMap: world.campaignRecipe});
}

openTrial().catch(error => {
  finishOpening();
  const root = document.querySelector<HTMLElement>('#interface')!;
  root.innerHTML = '<section class="boot-error"><h1>试玩载入失败</h1><p></p></section>';
  root.querySelector('p')!.textContent = String(error);
  console.error(error);
});
