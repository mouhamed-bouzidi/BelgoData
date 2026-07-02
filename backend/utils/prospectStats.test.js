const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateGrowthRate } = require('./prospectStats');

test('calculateGrowthRate returns 50 for current 150 and previous 100', () => {
  assert.equal(calculateGrowthRate(150, 100), 50);
});

test('calculateGrowthRate returns 0 when previous is zero', () => {
  assert.equal(calculateGrowthRate(10, 0), 0);
});
