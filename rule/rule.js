/* jshint esversion: 6 */

clause = require('./clause/clause.js');
proposition = require('./clause/proposition.js');
var db = require("../database").db;

/**
	In MongoDB, data should be like this:
 {
	command: {
		id: 1
		value: 20
	},
	clause: [
	  	[
	  		{
	  			op1: "1.1",
	  			operator: ">",
	  			op2: 20
	  		},
	  		{
	  			op1: "1.1",
	  			operator: "<",
	  			op2: 40
	  		}
	  	],
	  	[
	  		{
	  			op1: "2.1",
	  			operator: "==",
	  			op2: true
	  		}
	  	]
	  ]
  }
  */
Rule = function (callback) {
	db.retrieveRules((err, docs) => {
		if (err) throw err;

		this.rules = [];

		for (var result of docs) {
			var orExps = [];

			for (var andExpression of result.clause) {
				var andExps = [];

				for (var prop of andExpression) {
					andExps.push(new Proposition(prop.lhs, prop.operator, prop.rhs));
				}

				orExps.push(andExps);
			}

			this.rules.push({
				clause: new Clause(orExps),
				command: result.command
			});
		}


		callback();
	});
};

Rule.prototype.getCommandsIfClauseIsTrue = function(callback) {
	var commands = [];

	addCommandIfClauseIsTrue = (index) => {
		if (index >= this.rules.length) {
			callback(commands);
		} else {
			this.rules[index].clause.evaluate((res) => {
				if (res) commands.push(this.rules[index].command);
				addCommandIfClauseIsTrue(index + 1);
			});
		}
	};

	addCommandIfClauseIsTrue(0);
};
