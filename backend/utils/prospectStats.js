function calculateGrowthRate(current, previous) {
  if (!previous || previous <= 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

module.exports = { calculateGrowthRate };
