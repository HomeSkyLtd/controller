/*jshint esversion: 6 */

clause = require('./clause.js');
proposition = require('./proposition.js');

c = new Clause([
    [new Proposition("1.1", '>=', "2.1")],
    [new Proposition(0, '==', 0)]
]);
console.log(c.evaluate());
