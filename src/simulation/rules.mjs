/** Shared, validated wallet operations used by the current World. */
const finite = (value, label, minimum = 0) => {
  if (!Number.isFinite(value) || value < minimum) throw new TypeError(`${label} must be finite and >= ${minimum}`);
  return value;
};
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
