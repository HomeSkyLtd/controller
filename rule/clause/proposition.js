/*jshint esversion: 6 */

var db = require("../../database").db;

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function saveValue(lhsOrRhs, callback) {
	if (lhsOrRhs === undefined || lhsOrRhs === null) {
		throw new Error('[Proposition] Empty operand');
	} else if (typeof lhsOrRhs === 'string') {
		ids = lhsOrRhs.split('.');
		if (ids.length !== 2) {
			throw new Error ('[Proposition] format must be "id.id"');
		}

		nodeId = ids[0];
		dataId = ids[1];

		db.retrieveDataFromNodeAndDataId(nodeId, {id: dataId}, function(err, result) {
			if (err) console.log(err);
			else {
				callback(result.value);
			}
		});
	} else if (isNumeric(lhsOrRhs)) {
		callback(lhsOrRhs);
	} else {
		throw new Error ('[Proposition] wrong format. Number or "id.id"');
	}
}

Proposition = function(lhs, operator, rhs, cb){
	var ids;
	var nodeId;
	var dataId;

	this.lhs = lhs;
	this.operator = operator;
	this.rhs = rhs;
};

Proposition.prototype.evaluate = function(callback) {
	saveValue(this.lhs, (lhs) => {
		saveValue(this.rhs, (rhs) => {
		this.lhs = lhs;
		this.rhs = rhs;

	    switch(this.operator){
	        case '>':
	            callback(this.lhs > this.rhs);
				break;
	        case '<':
	            callback(this.lhs < this.rhs);
				break;
	        case '>=':
	            callback(this.lhs >= this.rhs);
				break;
	        case '<=':
	            callback(this.lhs <= this.rhs);
				break;
	        case '==':
	            callback(this.lhs == this.rhs);
				break;
	        case '!=':
	            callback(this.lhs != this.rhs);
				break;
	        default:
	            throw new Error(`Operator ${this.operator} is not defined`);
	    }
		});
	});
};

exports.proposition = Proposition;
