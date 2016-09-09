/*jshint esversion: 6 */

const db = require('./database').db;
const Rainfall = require('rainfall');
const Tcp = require('rainfall-tcp');
const Rule = require('./rule/rule.js');
var Homecloud = require('homecloud-controller').Homecloud;

const KEEP_ALIVE_TIME = 10 * 1000;//10s

var timers = {};
var networkInstances = {};

const homeCloudOptions = {
    username: "login123",
    password: "pass123",
    websocket: {
        address: "ws://localhost:8092/ws"
    },
    address: "http://localhost:8093"
};
var homecloud = new Homecloud(homeCloudOptions);

function startTimer(node_id, id) {
	if (id !== undefined)
		clearTimeout(id);
	return setTimeout(() => {
        console.log("Deactivating node with id " + node_id + " due to timeout.");
        db.deactivateNode(node_id, () => {});
		db.removeStateFromNodeId(node_id, () => {});
        homecloud.setNodeState(node_id, false);
	}, 2 * KEEP_ALIVE_TIME);
}

db.initDB(() => {
    const NETWORK_MAP = [Tcp];
    var rule;
    homecloud
        .onAction((message) => {
            //Try to make action
            var action = message.action;
            db.getNode(action.nodeId, (err, desc, activated) => {
                if (err) {
                    homecloud.actionResult(action, false);
                    return;
                }
                networkInstances[desc.netId].send(
                    desc.from,
                    {
                        packageType: 'command',
                        command: [{
                            id: action.commandId,
                            value: action.value
                        }]
                    },
                    () => {
                        //Send result
                        homecloud.actionResult(action, true);
                    }
                );
            });
        })
        .onRules((message) => {
            //Got new rules
            homecloud.getRules((response) => {
                if (response.status === 200) {
                    rule.updateRules(response.rules, () => {
                    });
                }
            });
        })
        .onAcceptNode((message) => {
            //accept or reject node
            var id = message.nodeId;
            db.getNode(id, (err, desc, activated, accepted) => {
                if (err) console.log("[NOTIFICATION] Tried to accept non existent node");
                else if (accepted === 3) console.log("[NOTIFICATION] Tried to accept accepted node");
                else if (accepted === 2) console.log("[NOTIFICATION] Tried to accept rejected node");
                else if (accepted === 0) console.log("[NOTIFICATION] Tried to accept non sent node");
                else {
                    console.log("[NOTIFICATION] Accepting node");
                    db.activateNode(id, () => {});
                    db.acceptNode(id, message.accept === 1, () => {});
                }
            });
        })
        .onRemoveNode((message) => {
            rule.removeRules(message.nodeId, () => {});
            db.removeNode(message.nodeId, () => {
                //Removed node
            });
        })
        .start();
	rule = new Rule.Rule(() => {
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

					function nodeInit(from) {
						db.newNode((err, id) => {
                            //Send to server
							rainfall.send(from, {
								packageType: 'iamcontroller | describeyourself | lifetime',
								'yourId': id,
								'lifetime': KEEP_ALIVE_TIME,
							}, (err) => {
								if (err) console.log(err);
								else {
                                    console.log("iamcontroller, describeyourself, lifetime Sent");
                                    timers[id] = startTimer(id);
                                    homecloud.setNodeState(id, true);
                                }
                            });
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
                                    homecloud.setNodeState(id, true);
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
                            var serverDesc = {
                                nodeClass: obj.nodeClass,
                                nodeId: obj.id
                            };

							var info = function(obj) {
								return obj.reduce((prev, cur)=>{
									if (prev[cur.id] !== undefined) console.error("dataType with repeated ids detected");
									prev[cur.id] = cur;
									return prev;
								}, {});
							};

                            if (obj.nodeClass & Rainfall.NODE_CLASSES.actuator) {
                                desc.commandType = info(obj.commandType);
                                serverDesc.commandType = obj.commandType;
                            }
							if (obj.nodeClass & Rainfall.NODE_CLASSES.sensor) {
							    desc.dataType = info(obj.dataType);
                                serverDesc.dataType = obj.dataType;
                            }
                            console.log(desc);
							db.setNodeDescription(obj.id, desc, from, net.id, (err) => {
								if (err) 
                                    console.error(err);
							});
                            //Send to server
                            homecloud.newNodes([serverDesc], (response) => {
                                db.sentNodeInfo(obj.id, () => {});
                            });
						}, 'description');

						rainfall.listen((obj, from) => {
							console.log("[KEEP ALIVE] from " + obj.id);
							timers[obj.id] = startTimer(obj.id, timers[obj.id]);
						}, 'keepalive');

						var sendCommandIfRulesAreTrue = () => {
							rule.getCommandsIfClauseIsTrue((commands) => {
								commands.forEach((cmd) => {
									db.getNode(cmd.nodeId, (err, desc, activated) => {
										if (err) {
											throw err;
										}

										networkInstances[desc.netId].send(
											desc.from,
											{
												packageType: 'command',
												command: [{
													id: cmd.commandId,
													value: cmd.value
												}]
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
							db.getNode(obj.id, (err, desc, activated, accepted) => {
								if (err) {
									console.log("	Received data from unknown node");
									return;
								}
                                if (accepted === 2) {
                                    console.log("   Received data from rejected node");
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
                                        if (accepted === 3) {
                                            //Sent to server
                                            homecloud.newData([{
                                                nodeId: obj.id,
                                                dataId: data.id,
                                                value: data.value,
                                                timestamp: time
                                            }], (response) => {
                                                //Erase
                                                db.removeNodeData(obj.id, data.id, time, () => {});
                                            });
                                        }
									}
									else
									   console.log("	Data with id " + data.id + " not declared");
								});
                                
								sendCommandIfRulesAreTrue();
							});
						}, 'data');

						//Listens for external rainfall commands
						rainfall.listen((obj, from) => {
							var time = Date.now();
							console.log("[NEW COMMAND] from " + obj.id  + " (network " + net.id + ") at " + time);
							db.getNode(obj.id, (err, desc, activated, accepted) => {
								if (err) {
									console.log("   Received data from unknown node");
									return;
								}
                                if (accepted === 2) {
                                    console.log("   Received data from rejected node");
                                    return;
                                }
                                if (!activated) {
                                    console.log("   Received data from deactivated node");
                                    return;
                                }
								obj.command.forEach((command) => {
									if (desc.commandType && desc.commandType[data.id] !== undefined) {
										console.log("	External Command with id " + command.id + " received: " + command.value);
										db.insertNodeCommand(obj.id, time, command, () => {});
                                        if (accepted === 2) {
                                            //Sent to server
                                            homecloud.newCommand([{
                                                nodeId: obj.id,
                                                commandId: command.id,
                                                value: command.value,
                                                timestamp: time
                                            }], (response) => {
                                                //Erase
                                                db.removeNodeCommand(obj.id, command.id, time, () => {});
                                            });
                                        }
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
