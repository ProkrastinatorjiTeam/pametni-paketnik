/**
 * Recommends products to a user based on their purchase history and a set of association rules.
 *
 * @param {string[]} userItems - An array of product names the user has purchased.
 * @param {object[]} rules - An array of association rules. Each rule has `lhs` (an array of product names), `rhs` (an array with a single product name), and `confidence`.
 * @param {number} [topN=3] - The maximum number of recommendations to return.
 * @returns {object[]} An array of recommended products, each with `product` and `confidence`, sorted by confidence.
 */
function recommendProducts(userItems, rules, topN = 3) {
  const userItemsSet = new Set(userItems);

  const recommendations = rules
    .filter(rule => {
      const lhsIsSubset = rule.lhs.every(item => userItemsSet.has(item));
      if (!lhsIsSubset) {
        return false;
      }

      const rhsItem = rule.rhs[0];
      if (userItemsSet.has(rhsItem)) {
        return false;
      }

      return true;
    })
    .map(rule => ({
      product: rule.rhs[0],
      confidence: rule.confidence,
    }));

  recommendations.sort((a, b) => b.confidence - a.confidence);

  return recommendations.slice(0, topN);
}

module.exports = {
  recommendProducts,
};
