const test = require('node:test');
const assert = require('node:assert/strict');
const { OPERATIONS, evaluate, resolveCollision, hasUniqueNonemptyNames } = require('../src/logic.js');

test('all supported operations return correct truth tables', () => {
  const cases = {
    AND: [[0,0,0],[0,1,0],[1,0,0],[1,1,1]],
    OR: [[0,0,0],[0,1,1],[1,0,1],[1,1,1]],
    XOR: [[0,0,0],[0,1,1],[1,0,1],[1,1,0]],
    NOR: [[0,0,1],[0,1,0],[1,0,0],[1,1,0]],
    NOT: [[0,0,1],[0,1,1],[1,0,0],[1,1,0]]
  };
  for (const op of OPERATIONS) for (const [own, other, expected] of cases[op])
    assert.equal(evaluate(op, own, other), expected, `${op}(${own}, ${other})`);
});
test('rejects invalid inputs and operations', () => {
  assert.throws(() => evaluate('NAND', 1, 0), /Unknown/);
  assert.throws(() => evaluate('AND', 2, 0), /must be 0 or 1/);
});
test('resolves a winner when results differ', () => {
  assert.deepEqual(resolveCollision({operation:'NOT',bit:0},{operation:'AND',bit:1}), { aResult:1,bResult:0,outcome:'a' });
  assert.deepEqual(resolveCollision({operation:'AND',bit:1},{operation:'NOT',bit:0}), { aResult:0,bResult:1,outcome:'b' });
});
test('matching 1s and matching 0s are both ties', () => {
  assert.equal(resolveCollision({operation:'OR',bit:1},{operation:'OR',bit:0}).outcome, 'tie');
  assert.equal(resolveCollision({operation:'AND',bit:1},{operation:'AND',bit:0}).outcome, 'tie');
});
test('names must be nonempty and unique regardless of case', () => {
  assert.ok(hasUniqueNonemptyNames(['Alpha', 'beta', 'NOVA', 'glitch']));
  assert.equal(hasUniqueNonemptyNames(['Alpha', ' alpha ']), false);
  assert.equal(hasUniqueNonemptyNames(['Alpha', '']), false);
});
