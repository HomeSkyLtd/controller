/*jshint esversion: 6 */

var should = require('should');
var rule = require('./rule.js');
var db = require('../database.js').db;

describe('insert-node', function() {

	it('Insert data in nodeState should work without errors', function (done) {

		db.changeStateFromNodeAndDataId(1, {id: 1, value: 30}, (err) => {

			if (err) {
				done(new Error("Connection refused with MongoDB. Is mongodb.service running?"));
			} else {

				describe('rule', function() {

					it('Rule 1 should work without errors', function(done) {
						db.insertRule({id: 3, value: 22},
							[[{lhs: 1, operator: '!=', rhs: 1}, {lhs: 1.1, operator: '<', rhs: 2.3}], [{lhs: '1.1', operator: '<=', rhs: 20}]],
							function (err) {
								if (err) {
									throw err;
								}

								r = new Rule (() => {
									r.getCommandsIfClauseIsTrue((commands) => {
										commands.should.be.exactly("[{id: 3, command: 22}]");
									});
								});
							});
						done();
					});

					it('Rule 2 should work without errors', function(done) {
						db.insertRule({id: 1, value: 20},
							[[{lhs: 1, operator: '==', rhs: 1}, {lhs: 1.1, operator: '<', rhs: 2.3}], [{lhs: '1.1', operator: '>', rhs: 20}]],
							function (err) {
								if (err) throw err;

								r = new Rule (() => {
									r.getCommandsIfClauseIsTrue((commands) => {
										commands.should.be.exactly("[{id: 3, command: 22}]");
									});
								});
							});
						done();
					});

					done();

				});
			}
		});

	});
});
