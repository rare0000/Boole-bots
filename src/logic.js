/* Pure game rules. Exported for Node tests and also available as window.BooleLogic. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BooleLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const OPERATIONS = ['AND', 'OR', 'XOR', 'NOT', 'NOR'];
  function evaluate(operation, own, opponent) {
    if (![0, 1].includes(own) || ![0, 1].includes(opponent)) throw new Error('Both bits must be 0 or 1.');
    switch (operation) {
      case 'AND': return own & opponent;
      case 'OR':  return own | opponent;
      case 'XOR': return own ^ opponent;
      case 'NOT': return own === 1 ? 0 : 1;
      case 'NOR': return own | opponent ? 0 : 1;
      default: throw new Error('Unknown Boolean operation: ' + operation);
    }
  }
  function resolveCollision(a, b) {
    const aResult = evaluate(a.operation, a.bit, b.bit);
    const bResult = evaluate(b.operation, b.bit, a.bit);
    return { aResult, bResult, outcome: aResult === bResult ? 'tie' : aResult === 1 ? 'a' : 'b' };
  }
  function hasUniqueNonemptyNames(names) {
    const trimmed = names.map(n => String(n).trim().toLowerCase());
    return trimmed.every(Boolean) && new Set(trimmed).size === names.length;
  }
  return { OPERATIONS, evaluate, resolveCollision, hasUniqueNonemptyNames };
});
