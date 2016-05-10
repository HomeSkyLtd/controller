/*jshint esversion: 6 */

var db = require("./database").db;

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

Proposition = function(lhs, operator, rhs){
	var ids;
	var node_id;
	var data_id;

	if (!lhs || lhs === null) {
		throw new Error('[Proposition] Empty lhs');
	} else if (isNumeric(lhs)) {
		this.lhs = lhs;
	} else if (typeof lhs === 'string') {
		ids = lhs.split('.');
		if (ids.length !== 2) {
			throw new Error ('[Proposition] lhs format must be "id.id"');
		}
		node_id = ids[0];
		data_id = ids[1];
	} else {
		throw new Error ('[Proposition] lhs wrong format. Number or "id.id"');
	}

    this.operator = operator;

	if (!rhs || rhs === null) {
		throw new Error('[Proposition] Empty rhs');
	} else if (isNumeric(rhs)) {
		this.rhs = rhs;
	} else if (typeof rhs === 'string') {
		ids = rhs.split('.');
		if (ids.length !== 2) {
			throw new Error ('[Proposition] rhs format must be "id.id"');
		}
		node_id = ids[0];
		data_id = ids[1];
	} else {
		throw new Error ('[Proposition] rhs wrong format. Number or "id.id"');
	}
    this.rhs = rhs;
};

Proposition.prototype.evaluate = function(){
    switch(this.operator){
        case '>':
            return this.lhs > this.rhs;
        case '<':
            return this.lhs < this.rhs;
        case '>=':
            return this.lhs >= this.rhs;
        case '<=':
            return this.lhs <= this.rhs;
        case '==':
            return this.lhs === this.rhs;
        case '!=':
            return this.lhs !== this.rhs;
        default:
            throw new Error(`Operator ${this.operator} is not defined`);
    }
};

exports.proposition = Proposition;
