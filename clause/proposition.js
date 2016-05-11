/*jshint esversion: 6 */

var db = require("./database").db;

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

Proposition = function(lhs, operator, rhs){
	var ids;
	var nodeId;
	var dataId;

	if (!lhs || lhs === null) {
		throw new Error('[Proposition] Empty lhs');
	} else if (isNumeric(lhs)) {
		this.lhs = lhs;
	} else if (typeof lhs === 'string') {
		ids = lhs.split('.');
		if (ids.length !== 2) {
			throw new Error ('[Proposition] lhs format must be "id.id"');
		}

		nodeId = ids[0];
		dataId = ids[1];

		db.retrieveDataFromNodeAndDataId(nodeId, {id: dataId}, function(err, result) {
			if (err) console.log(err);
			else {
				this.lhs = result;
			}
		});
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
			throw new Error ('[Proposition] lhs format must be "id.id"');
		}

		nodeId = ids[0];
		dataId = ids[1];

		db.retrieveDataFromNodeAndDataId(nodeId, {id: dataId}, function(err, result) {
			if (err) console.log(err);
			else {
				this.rhs = result;
			}
		});
	} else {
		throw new Error ('[Proposition] rhs wrong format. Number or "id.id"');
	}
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
