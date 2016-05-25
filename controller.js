/*jshint esversion: 6 */

const db = require('./database').db;
const Rainfall = require('rainfall');
const Tcp = require('rainfall-tcp');
const Rule = require('./rule/rule.js');

const KEEP_ALIVE_TIME = 10 * 1000;//10s

var timers = {};
var networkInstances = {};

function startTimer(node_id, id) {
	if (id !== undefined)
		clearTimeout(id);
	return setTimeout(() => {
        db.deactivateNode(node_id, () => {});
		db.removeStateFromNodeId(node_id, () => {});
		console.log("Deactivating node with id " + node_id + " due to timeout.");
	}, 2 * KEEP_ALIVE_TIME);
}

db.initDB(() => {
    const NETWORK_MAP = [Tcp];
	var rule = new Rule.Rule(() => {
		db.getNetworks((err, nets) => {
			// console.log(nets);
			nets.forEach((net, key) => {
				if (!NETWORK_MAP[net.type]) {
					console.log("Unexisting network interface");
					return;
				}
				NETWORK_MAP[net.type].createDriver(net.params, (err, driver) => {
					if (err) {
						console.log("Failed to start network interface:");
						console.log(err);
						return;
					}
					var rainfall = new Rainfall.Rainfall(driver);
					networkInstances[net.id] = rainfall;
					console.log(networkInstances);

					function nodeInit(from) {
						db.newNode((err, id) => {
							rainfall.send(from, {
								packageType: 'iamcontroller | describeyourself | lifetime',
								'yourId': id,
								'lifetime': KEEP_ALIVE_TIME,
							}, (err)=>{
								if(err) console.log(err);
								else console.log("iamcontroller, describeyourself, lifetime Sent");});
							});
						}
						console.log("Listening using params:");
						console.log(net.params);
						//Listens for new connections
						rainfall.listen((obj, from) => {
							console.log("[NEW CONNECTION] (network " + net.id + ")");
							nodeInit(from);
						}, 'whoiscontroller');

						//Listens for reconnections
						rainfall.listen((obj, from) => {
							console.log("[RECONNECTION] from " + obj.id + " (network " + net.id + ")");
							db.nodeExists(obj.id, (err, exists) => {
								if (exists) {
									rainfall.send(from, {
										packageType: 'welcomeback | lifetime',
										'lifetime': KEEP_ALIVE_TIME,
									}, (err) => {
										if(err) console.log(err);
									});
									console.log("Sending welcomeback and lifetime to " + JSON.stringify(from));
									db.activateNode(obj.id, () => {});
									timers[obj.id] = startTimer(obj.id, timers[obj.id]);
								}
								else
								nodeInit(from);
							});
						}, 'iamback');

						//Listens for descriptions
						rainfall.listen((obj, from) => {
							console.log("[NEW DESCRIPTION] from " + obj.id + " (network " + net.id + ")");
							var desc = {nodeClass: obj.nodeClass};

							var info = function(obj) {
								return obj.reduce((prev, cur)=>{
									if (prev[cur.id] !== undefined) console.error("dataType with repeated ids detected");
									prev[cur.id] = cur;
									return prev;
								}, {});
							};

							if (obj.nodeClass & Rainfall.NODE_CLASSES.actuator)
							desc.commandType = info(obj.commandType);
							if (obj.nodeClass & Rainfall.NODE_CLASSES.sensor)
							desc.dataType = info(obj.dataType);

							db.setNodeDescription(obj.id, desc, from, net.id, (err) => {
								if(err) console.error(err);
							});
							timers[obj.id] = startTimer(obj.id);

							db.activateNode(obj.id, () => {});
						}, 'description');

						rainfall.listen((obj, from) => {
							console.log("[KEEP ALIVE] from " + obj.id);
							timers[obj.id] = startTimer(obj.id, timers[obj.id]);
						}, 'keepalive');

						var sendCommandIfRulesAreTrue = () => {
							rule.getCommandsIfClauseIsTrue((commands) => {
								commands.forEach((cmd) => {
									db.getNode(cmd.nodeId, (err, desc, activated) => {
										console.log(JSON.stringify(desc));
										networkInstances[desc.netId].send(
											desc.from,
											{
												packageType: 'command',
												command: cmd
											},
											() => {
												console.log("[COMMAND] Command " + cmd.value + " sent to node " + cmd.nodeId);
											}
										);
									});
								});
							});
						};

						//Listens for data
						rainfall.listen((obj, from) => {
							var time = Date.now();
							console.log("[NEW DATA] from " + obj.id  + " (network " + net.id + ") at " + time);
							db.getNode(obj.id, (err, desc, activated) => {
								if (err) {
									console.log("	Received data from unknown node");
									return;
								}
								if (!activated) {
									console.log("   Received data from deactivated node");
									return;
								}
								obj.data.forEach((data) => {
									if (desc.dataType && desc.dataType[data.id] !== undefined) {
										console.log("	Data with id " + data.id + " received: " + data.value);
										db.insertNodeData(obj.id, time, data, () => {});
										db.changeStateFromNodeAndDataId(obj.id, data, () => {});
									}
									else
									console.log("	Data with id " + data.id + " not declared");
								});
								sendCommandIfRulesAreTrue();
							});
						}, 'data');

						//Listens for external rainfallmands
						rainfall.listen((obj, from) => {
							var time = Date.now();
							console.log("[NEW COMMAND] from " + obj.id  + " (network " + net.id + ") at " + time);
							db.getNode(obj.id, (err, desc) => {
								if (err) {
									console.log("   Received data from unknown node");
									return;
								}
								obj.command.forEach((command) => {
									if (desc.commandType && desc.commandType[data.id] !== undefined) {
										console.log("	External Command with id " + command.id + " received: " + command.value);
										db.insertNodeCommand(obj.id, time, command, () => {});
									}
									else
									console.log("	External Command with id " + command.id + " not declared");
								});
							});
							sendCommandIfRulesAreTrue();
						}, 'externalcommand');
					});
				}
			);
		});
	});
});
