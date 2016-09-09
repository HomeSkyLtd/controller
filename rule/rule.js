/* jshint esversion: 6 */

const clause = require('./clause/clause.js');
const proposition = require('./clause/proposition.js');
const db = require("../database").db;

/**
	In MongoDB, data should be like this:
 {
	command: {
		nodeId: 1,
        commandId: 1,
		value: 20
	},
	clauses: [
	  	[
	  		{
	  			lhs: "1.1",
	  			operator: ">",
	  			rhs: 20
	  		},
	  		{
	  			lhs: "1.1",
	  			operator: "<",
	  			rhs: 40
	  		}
	  	],
	  	[
	  		{
	  			lhs: "2.1",
	  			operator: "==",
	  			rhs: true
	  		}
	  	]
	  ]
  }
  */

function createRulesObject(objRules) {
    var rules = [];
    for (var result of objRules) {
        var orExps = [];

        for (var andExpression of result.clauses) {
            var andExps = [];

            for (var prop of andExpression) {
                andExps.push(new Proposition(prop.lhs, prop.operator, prop.rhs));
            }

            orExps.push(andExps);
        }

        rules.push({
            clause: new Clause(orExps),
            command: result.command
        });
    }
    return rules;
}
var Rule = function (callback) {
	db.retrieveRules((err, docs) => {
		if (err) throw err;

		this.rules = createRulesObject(docs);

		callback();
	});
};

Rule.prototype.updateRules = function (rules, callback) {
    this.rules = createRulesObject(rules);
    db.updateRules(rules, callback);
};

Rule.prototype.removeRules = function (nodeId, callback) {
    this.rules = this.rules.filter((rule) => {
        return rule.command.nodeId != nodeId;
    });
    removeNodeRules(nodeId, callback);
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

exports.Rule = Rule;
