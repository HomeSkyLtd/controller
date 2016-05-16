/*jshint esversion: 6 */

rule = require('./rule.js');

r = new Rule (() => {
	r.getCommandsIfClauseIsTrue((commands) => {
		console.log(commands);
	});
});
