const { MIN_VOTES, GO_THRESHOLD, SKIP_THRESHOLD } = require('../config');

function wilsonLowerBound(up, total, z = 1.96) {
  if (total === 0) return 0;
  const p = up / total;
  const z2 = z * z;
  const numerator = p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  const denominator = 1 + z2 / total;
  return numerator / denominator;
}

function mealVerdict(dishStats = []) {
  const rated = dishStats.filter(d => d.total >= MIN_VOTES);
  if (dishStats.length === 0 || rated.length * 2 < dishStats.length) {
    return { verdict: 'insufficient', score: null, dragDish: null };
  }

  const scoredDishes = rated.map(d => ({
    name: d.name,
    score: wilsonLowerBound(d.up, d.total)
  }));

  const totalScore = scoredDishes.reduce((sum, d) => sum + d.score, 0);
  const score = totalScore / scoredDishes.length;

  let verdict = 'meh';
  if (score >= GO_THRESHOLD) {
    verdict = 'go';
  } else if (score < SKIP_THRESHOLD) {
    verdict = 'skip';
  }

  let dragDish = null;
  if (verdict !== 'go') {
    scoredDishes.sort((a, b) => a.score - b.score);
    dragDish = scoredDishes[0]?.name || null;
  }

  return { verdict, score, dragDish };
}

module.exports = {
  wilsonLowerBound,
  mealVerdict
};
