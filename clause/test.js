/*jshint esversion: 6 */

clause = require('./clause.js');
proposition = require('./proposition.js');

c = new Clause([
    [new Proposition(1, '!=', 1)],
    [new Proposition("1.1", '>=', "2.1")]
]);
c.evaluate((isTrue) => {
	console.log("[CLAUSE] Evaluation: " + isTrue);
});
