/* jshint esversion: 6 */

clause = require('../clause/clause.js');
proposition = require('../clause/proposition.js')
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
					andExps.push(new Proposition(prop.op1, prop.operator, prop.op2));
				}

				orExps.push(andExps);
			}

			this.rules.push({
				clause: new Clause(orExps),
				command: result.commands
			});
		}

		callback();
	});
};

Rule.prototype.getCommandsIfClauseIsTrue = function(callback) {
	var commands = [];

	getCommandIfClauseIsTrue = (index) => {
		if (index >= this.rules.length) {
			callback(commands);
		} else {
			this.rules[index].clause.evaluate((res) => {
				if (res) commands.push(this.rules[index].command);
				getCommandIfClauseIsTrue(index + 1);
			});
		}
	};

	getCommandIfClauseIsTrue(0);
};
