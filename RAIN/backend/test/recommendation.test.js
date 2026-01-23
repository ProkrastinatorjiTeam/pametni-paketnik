const { expect } = require('chai');
const { recommendProducts } = require('../services/recommendationService');

describe('recommendProducts', () => {
  const rules = [
    { lhs: ["klobase", "jajca"], rhs: ["krompir"], confidence: 0.85 },
    { lhs: ["klobase"], rhs: ["jajca"], confidence: 0.9 },
    { lhs: ["mleko"], rhs: ["kruh"], confidence: 0.7 },
    { lhs: ["kruh", "maslo"], rhs: ["marmelada"], confidence: 0.95 }
  ];

  it('should recommend a product based on a matching rule', () => {
    const userItems = ["klobase", "jajca"];
    const recommendations = recommendProducts(userItems, rules);
    expect(recommendations).to.deep.equal([{ product: "krompir", confidence: 0.85 }]);
  });

  it('should not recommend a product the user already has', () => {
    const userItems = ["klobase", "jajca", "krompir"];
    const recommendations = recommendProducts(userItems, rules);
    expect(recommendations).to.be.an('array').that.is.empty;
  });

  it('should recommend a product if the LHS is a subset of user items', () => {
    const userItems = ["klobase"];
    const recommendations = recommendProducts(userItems, rules);
    expect(recommendations).to.deep.equal([{ product: "jajca", confidence: 0.9 }]);
  });

  it('should return multiple recommendations, sorted by confidence', () => {
    const multiRule = [
        { lhs: ["a"], rhs: ["b"], confidence: 0.9 },
        { lhs: ["c"], rhs: ["d"], confidence: 0.8 },
        { lhs: ["a", "c"], rhs: ["e"], confidence: 1.0 }
    ];
    const userItems = ["a", "c"];
    const recommendations = recommendProducts(userItems, multiRule, 3);
    expect(recommendations).to.deep.equal([
        { product: "e", confidence: 1.0 },
        { product: "b", confidence: 0.9 },
        { product: "d", confidence: 0.8 }
    ]);
  });

  it('should return an empty array when no rules match', () => {
    const userItems = ["banane", "jogurt"];
    const recommendations = recommendProducts(userItems, rules);
    expect(recommendations).to.be.an('array').that.is.empty;
  });

  it('should respect the topN limit', () => {
     const multiRule = [
        { lhs: ["a"], rhs: ["b"], confidence: 0.9 },
        { lhs: ["c"], rhs: ["d"], confidence: 0.8 },
        { lhs: ["a", "c"], rhs: ["e"], confidence: 1.0 }
    ];
    const userItems = ["a", "c"];
    const recommendations = recommendProducts(userItems, multiRule, 1);
    expect(recommendations).to.deep.equal([{ product: "e", confidence: 1.0 }]);
  });

  it('should return an empty array if the user already has all potential recommended items', () => {
    const userItems = ["klobase", "jajca"];
    const rulesWithExistingRhs = [
        { lhs: ["klobase"], rhs: ["jajca"], confidence: 0.9 }
    ];
    const recommendations = recommendProducts(userItems, rulesWithExistingRhs);
    expect(recommendations).to.be.an('array').that.is.empty;
  });
});
