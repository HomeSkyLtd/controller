/*jshint esversion: 6 */

var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017/controller';


var getDBConnection = function(){
    var connection = null;
    return function(cb){
        if(!connection){
            MongoClient.connect(url, function(err, db) {
                connection = db;
                cb(err, connection);
            });
        }
        else cb(null, connection);
    };
}();

function initDB(cb) {
    createIndexes(cb);
}

const INDEXES_COLLECTIONS = {
    nodes: [
        {
            keys: { id: 1 },
            options: { unique: true }
        }
    ]
};

const NODE_ACCEPTED = {
    NOT_SENT: 0,
    SENT: 1,
    NOT_ACCEPTED: 2,
    ACCEPTED: 3
};

function createIndexes(cb) {
    function createIndex(db, indexes, cb) {
        if (indexes.length === 0) {
            if (cb) cb();
            return;
        }
        var index = indexes.pop();
        db.collection(index.collection).createIndex(index.keys, index.options, (err, result) => {
            if (err) cb(err);
			else createIndex(db, indexes, cb);
        });
    }
    getDBConnection((err, db) => {
		if (err) cb(err);

        var indexes = Object.keys(INDEXES_COLLECTIONS).reduce((previous, value) => {
            return previous.concat(INDEXES_COLLECTIONS[value].map((val) => {
                val.collection = value;
                return val;
            }));
        }, []);
        createIndex(db, indexes, cb);
    });
}

function getNetworks(cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

        var collection = db.collection('networks');
        collection.find().toArray((err, docs) => {
            for(var item of docs){
                item.id = String(item._id);
                delete item._id;
            }
            cb(err, docs);
        });
    });
}

/* NODE FUNCTIONS */

function nodeExists(id, cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

        var collection = db.collection('nodes');
        collection.find({id: id}).toArray((err, docs) => {

            if(err) cb(err, false);
            else if (docs.length === 0) cb(null, false);
            else if(docs[0].description === undefined) cb(null, false);
            else cb(null, true);
        });
    });
}

function getNode(id, cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

        var collection = db.collection('nodes');
        collection.findOne({id: id}, (err, docs) => {
			if (err) cb(err);
            else if(docs === null) cb(new Error("Requested node id " + id + " not found"), null);
			else if (docs.description === undefined) cb(new Error("Requested node id " + id +
				" has no description"));
            else cb(null, docs.description, docs.activated, docs.accepted);
        });
    });
}

function removeNode(id, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);
        db.collection('nodes').removeOne({id: id}, (err, docs) => {
            if (err) cb(err);
            else cb();
        });
    });
}

function newNode(cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

        var collection = db.collection('nodes');
        getAndIncrementNodeCounter((err, id) => {
            collection.insertOne({id: id}, function(err, r){
                cb(err, id);
            });
        });
    });
}

function deactivateNode(id, cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

		var collection = db.collection('nodes');
		collection.updateOne({id: id}, {$set:{activated: false}},
			null, (err, result)=>{
            if(err) cb(err);
            else if(result.result.ok !== 1){
				cb(new Error("Error deactivating node " + id));
			}
			else cb();
		});
	});
}

function activateNode(id, cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

		var collection = db.collection('nodes');
		collection.updateOne({id: id}, {$set:{activated: true}},
			null, (err, result)=>{
            if(err) cb(err);
            else if(result.result.ok !== 1){
                cb(new Error("Error deactivating node " + id));
            }
            else cb();
		});
	});
}

function sentNodeInfo(id, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);

        db.collection('nodes').updateOne({id: id}, {$set:{accepted: 1}},
            null, (err, result)=>{
            if(err) cb(err);
            else if(result.result.ok !== 1){
                cb(new Error("Error setting sent node " + id));
            }
            else cb();
        });
    });
}

function acceptNode(id, accept, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);

        var collection = db.collection('nodes');
        collection.updateOne({id: id}, {$set:{accepted: accept ? 3 : 2}},
            null, (err, result)=>{
            if(err) cb(err);
            else if(result.result.ok !== 1){
                cb(new Error("Error accepting node " + id));
            }
            else cb();
        });
    });
}


/*  DATA AND COMMAND FUNCTIONS */

function insertNodeData(id, time, data, cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

		var collection = db.collection('nodeData');
		collection.insertOne({id: id, time: time, data: data}, function(err, r){
			if(err){
                cb(err);
            }
            else{
                cb();
            }
		});
	});
}

function removeNodeData(id, dataId, time, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);

        var collection = db.collection('nodeData');
        collection.deleteOne({id: id, time: time, 'data.id': dataId}, function(err, r){
            if(err){
                cb(err);
            }
            else{
                cb();
            }
        });
    });
}

function getAllData(cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);
        db.collection('nodeData').find().toArray(function(err, docs){
            if (err) cb(err);
            else cb(null, docs);
        });
    });
}

function getAllNodeData(nodeId, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);
        db.collection('nodeData').find({id: nodeId}).toArray(function(err, docs){
            if (err) cb(err);
            else cb(null, docs);
        });
    });
}


/* Human commands */
function insertNodeCommand(id, time, command, cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

		var collection = db.collection('nodeCommands');
		collection.insertOne({id: id, time: time, command: command}, function(err, r){
			if(err){
				cb(err);
			}
			else cb();
		});
	});
}


function removeNodeCommand(id, commandId, time, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);

        var collection = db.collection('nodeCommands');
        collection.deleteOne({id: id, time: time, 'command.id': commandId}, function(err, r){
            if(err){
                cb(err);
            }
            else{
                cb();
            }
        });
    });
}

function getAllCommands(cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);
        db.collection('nodeCommands').find({}).toArray(function(err, docs){
            if (err) cb(err);
            else cb(null, docs);
        });
    });
}

function getAllNodeCommands(nodeId, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);
        db.collection('nodeCommands').find({id: nodeId}).toArray(function(err, docs){
            if (err) cb(err);
            else cb(null, docs);
        });
    });
}



function setNodeDescription(id, description, from, netId, cb) {
    getDBConnection((err, db) => {
		if (err) cb(err);

        description.from = from;
        description.netId = netId;

        var collection = db.collection('nodes');
        collection.updateOne({id: id},
            {$set:{description: description, activated: true, accepted: 0}},
			null, (err, result)=>{
            if(err) cb(err);
            else if(result.result.ok !== 1){
                cb(new Error("Error updating node description for node id " + id));
            }
			else cb();
        });
    });
}

function getAndIncrementNodeCounter(cb){
    getDBConnection((err, db) => {
		if (err) cb(err);

        var collection = db.collection('nodeCount');
        collection.findOne({}, (err, doc)=>{
            if(err) cb(err);
            else if(doc === null){
                collection.insertOne({count: 1}, (err, r)=>{
                    if(err) cb(err);
                    else if (r.result.ok != 1)
                        cb(new Error("Error creating node count"));
                    else cb(null, 0);
                });
            }
            else{
                collection.updateOne({count: doc.count}, {$set:{count: doc.count+1}});
                cb(null, doc.count);
            }
        });
    });
}

function retrieveDataFromNodeAndDataId(nodeId, data, cb) {
	getDBConnection((err, db) => {
		if (err) cb(err);

		var collection = db.collection('nodeState');
		collection.findOne({nodeId: Number(nodeId), dataId: Number(data.id)},
		(err, result) => {
			cb (err, result);
		});
	});
}

function changeStateFromNodeAndDataId(nodeId, data, cb) {
	getDBConnection((err, db) => {
		if (err) cb(err);

		db.collection('nodeState').updateOne(
			{nodeId: nodeId, dataId: data.id},
			{$set: {value: data.value}},
			{upsert: true},
			function(err, doc) {
				cb (err);
			});
	});
}

function retrieveDataFromNodeAndCommandId(nodeId, command, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);

        var collection = db.collection('nodeState');
        collection.findOne({nodeId: Number(nodeId), commandId: Number(command.id)},
        (err, result) => {
            cb (err, result);
        });
    });
}

function changeStateFromNodeAndCommandId(nodeId, command, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);

        db.collection('nodeState').updateOne(
            {nodeId: nodeId, commandId: command.id},
            {$set: {value: command.value, invalidState: command.invalidState}},
            {upsert: true},
            function(err, doc) {
                cb (err);
            });
    });
}

function removeStateFromNodeId(nodeId, cb) {
	getDBConnection((err, db) => {
		if (err) cb(err);

		db.collection('nodeState').deleteMany(
			{nodeId: nodeId},
			function (err, resuls) {
				cb(err);
			}
		);
	});
}

function retrieveRules(cb) {
	getDBConnection((err, db) => {
		if (err) cb(err);

		var collection = db.collection('rules');
		collection.find().toArray(function (err, result) {
			cb (err, result);
		});
	});
}

function insertRule(command, clauses, cb) {
	getDBConnection((err, db) => {
		if (err) cb(err);

		db.collection('rules').insertOne({
			command: command,
			clauses: clauses
		}, function(err, result) {
			if (err) cb(err);
			else cb();
		});
	});
}

function updateRules(rules, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);
        db.collection('rules').deleteMany({}, function (err, response) {
            if (err) cb(err);
            if (rules.length > 0) {
                db.collection('rules').insertMany(rules, function(err, result) {
                    if (err) cb(err);
                    else cb();
                });
            } else {
                cb();
            }
        });
    });
}

function removeNodeRules(nodeId, cb) {
    getDBConnection((err, db) => {
        if (err) cb(err);
        db.collection('rules').deleteMany({'command.nodeId': nodeId}, function (err, response) {
            if (err) cb(err);
            else cb();
        });
    });   
}

function closeDB(){
    getDBConnection((err, db)=>{
        db.close();
    });
}



// getAndIncrementNodeCounter((count)=>{
//     console.log(count);
//     closeDB();
// });

// newNode((id)=>{
// 	setNodeDescription(id, {info: "someinfo"}, ()=>{
// 		deactivateNode(id, ()=>{
// 			getNode(id, (err, r)=>{
// 				console.log(r);
//                 closeDB();
// 			});
// 		});
// 	});
// });

export_functions = {
    getNetworks: getNetworks,
    nodeExists: nodeExists,
    getNode: getNode,
    newNode: newNode,
    removeNode: removeNode,
    deactivateNode: deactivateNode,
    activateNode: activateNode,
    insertNodeData: insertNodeData,
    removeNodeData: removeNodeData,
    insertNodeCommand: insertNodeCommand,
    removeNodeCommand: removeNodeCommand,
    setNodeDescription: setNodeDescription,
    closeDB: closeDB,
	retrieveDataFromNodeAndDataId: retrieveDataFromNodeAndDataId,
	changeStateFromNodeAndDataId: changeStateFromNodeAndDataId,
    retrieveDataFromNodeAndCommandId: retrieveDataFromNodeAndCommandId,
    changeStateFromNodeAndCommandId: changeStateFromNodeAndCommandId,
	removeStateFromNodeId: removeStateFromNodeId,
	retrieveRules: retrieveRules,
	insertRule: insertRule,
    updateRules: updateRules,
    removeNodeRules: removeNodeRules,
    acceptNode: acceptNode,
    sentNodeInfo: sentNodeInfo,
    NODE_ACCEPTED: NODE_ACCEPTED,
    getAllData: getAllData,
    getAllNodeData: getAllNodeData,
    getAllCommands: getAllCommands,
    getAllNodeCommands: getAllNodeCommands,
    initDB: initDB
};

exports.db = export_functions;

