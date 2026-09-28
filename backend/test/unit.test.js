const assert = require('assert');
const { wilsonLowerBound, mealVerdict } = require('../lib/scoring');
const { weekdayInTz, dateInTz } = require('../lib/time');

function approxEqual(actual, expected, tolerance = 0.001, msg = '') {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${msg} Expected ${expected} ± ${tolerance}, but got ${actual}`
  );
}

// 1. Wilson Lower Bound tests
approxEqual(wilsonLowerBound(0, 0), 0, 0.001, 'wilson(0,0)');
approxEqual(wilsonLowerBound(1, 1), 0.2065, 0.001, 'wilson(1,1)');
approxEqual(wilsonLowerBound(2, 2), 0.3424, 0.001, 'wilson(2,2)');
approxEqual(wilsonLowerBound(10, 10), 0.7225, 0.001, 'wilson(10,10)');
approxEqual(wilsonLowerBound(50, 100), 0.4038, 0.001, 'wilson(50,100)');
approxEqual(wilsonLowerBound(70, 80), 0.785, 0.001, 'wilson(70,80)');
assert(wilsonLowerBound(2, 2) < wilsonLowerBound(70, 80), 'wilson(2,2) < wilson(70,80)');

// 2. Meal Verdict tests
const goRes = mealVerdict([{ up: 24, total: 30 }, { up: 26, total: 30 }]);
assert.strictEqual(goRes.verdict, 'go', 'Verdict should be go');
approxEqual(goRes.score, 0.665, 0.01, 'Go score ≈ 0.665');

const mehRes = mealVerdict([{ up: 50, total: 100 }, { up: 50, total: 100 }]);
assert.strictEqual(mehRes.verdict, 'meh', 'Verdict should be meh');
approxEqual(mehRes.score, 0.404, 0.005, 'Meh score ≈ 0.404');

const skipRes = mealVerdict([
  { up: 3, total: 10, name: 'A' },
  { up: 12, total: 100, name: 'B' }
]);
assert.strictEqual(skipRes.verdict, 'skip', 'Verdict should be skip');
assert.strictEqual(skipRes.dragDish, 'B', 'dragDish should be B');

const insuffRes = mealVerdict([
  { up: 5, total: 5 },
  { up: 1, total: 2 },
  { up: 0, total: 1 }
]);
assert.strictEqual(insuffRes.verdict, 'insufficient', 'Verdict should be insufficient');
assert.strictEqual(insuffRes.score, null, 'Score should be null');

const emptyRes = mealVerdict([]);
assert.strictEqual(emptyRes.verdict, 'insufficient', 'Verdict on empty should be insufficient');
assert.strictEqual(emptyRes.score, null, 'Score should be null on empty');

// 3. Timezone tests
const sundayUtc = new Date('2026-01-04T19:00:00Z');
assert.strictEqual(weekdayInTz(sundayUtc, 'Asia/Kolkata'), 1, 'Sunday 19:00 UTC is Monday in Asia/Kolkata');
assert.strictEqual(dateInTz(sundayUtc, 'Asia/Kolkata'), '2026-01-05', 'Date is 2026-01-05 in Asia/Kolkata');

console.log('All unit tests passed successfully.');
