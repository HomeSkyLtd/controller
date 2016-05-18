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
        else cb(err, connection);
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
    ],
    nodeState: [
        {
            keys: { nodeId: 1, dataId: 1},
            options: { unique: true }
        }
    ]
};

function createIndexes(cb) {
    function createIndex(db, indexes, cb) {
        if (indexes.length === 0) {
            if (cb) cb();
            return;
        }
        var index = indexes.pop();
        db.collection(index.collection).createIndex(index.keys, index.options, (err, result) => {
            if (err)
                throw err;
            createIndex(db, indexes, cb);
        });
    }
    getDBConnection((err, db) => {
		if (err) throw err;

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
    getDBConnection((db) => {
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
    getDBConnection((db) => {
        var collection = db.collection('nodes');
        collection.find({id: id}).toArray((err, docs) => {
<<<<<<< HEAD
            if(docs.length === 1) cb(err, true);
            else if (docs.length === 0) cb(err, false);
            else cb(new Error("More than one node with id " + id));
=======
            if(err) cb(err, false);
            else if (docs.length === 0) cb(null, false);
            else if(docs.description === undefined) cb(null, false);
            else cb(null, true);
>>>>>>> 8e17e5fe9988ad46ff49eff7c174bf00c978a480
        });
    });
}

function getNode(id, cb) {
    getDBConnection((db) => {
        var collection = db.collection('nodes');
        collection.findOne({id: id}, (err, docs) => {
			if (err) cb(err);
            else if(docs === null) cb(new Error("Requested node id " + id + " not found"), null);
			else if (docs.description === undefined) cb(new Error("Requested node id " + id +
				" has no description"));
            else cb(null, docs.description, docs.activated);
        });
    });
}

function newNode(cb) {
    getDBConnection((db) => {
        var collection = db.collection('nodes');
        getAndIncrementNodeCounter((id) => {
            collection.insertOne({id: id}, function(err, r){
                cb(err, id);
            });
        });
    });
}

function deactivateNode(id, cb) {
    getDBConnection((db) => {
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
    getDBConnection((db) => {
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


/*  DATA AND COMMAND FUNCTIONS */

function insertNodeData(id, time, data, cb) {
    getDBConnection((db) => {
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

/* Human commands */
function insertNodeCommand(id, time, command, cb) {
    getDBConnection((err, db) => {
		var collection = db.collection('nodeCommands');
		collection.insertOne({id: id, time: time, command: command}, function(err, r){
			if(err){
				cb(err);
			}
			else cb();
		});
	});
}

function setNodeDescription(id, description, from, netId, cb) {
    getDBConnection((db) => {
        var collection = db.collection('nodes');
        collection.updateOne({id: id},
            {$set:{description: description, activated: true, from: from, netId: netId}},
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
    getDBConnection((db) => {
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
	getDBConnection((db) => {
		var collection = db.collection('nodeState');
		collection.findOne({nodeId: Number(nodeId), dataId: Number(data.id)},
		(err, result) => {
			cb (err, result);
		});
	});
}

function changeStateFromNodeAndDataId(nodeId, data, cb) {
	getDBConnection((db) => {
		db.collection('nodeState').updateOne(
			{nodeId: nodeId, dataId: data.id},
			{$set: {value: data.value}},
			{upsert: true},
			function(err, doc) {
				cb (err);
			});
	});
}

function removeStateFromNodeId(nodeId, cb) {
	getDBConnection((db) => {
		db.collection('nodeState').deleteMany(
			{nodeId: nodeId},
			function (err, resuls) {
				cb(err);
			}
		);
	});
}

function retrieveRules(cb) {
	getDBConnection((db) => {
		var collection = db.collection('rules');
		collection.find().toArray(function (err, result) {
			cb (err, result);
		});
	});
}

function insertRule(command, clause, cb) {
	getDBConnection((db) => {
		db.collection('rules').insertOne({
			command: command,
			clause: clause
		}, function(err, result) {
			if (err) cb(err);
			else cb();
		});
	});
}

function closeDB(){
    getDBConnection((db)=>{
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
    deactivateNode: deactivateNode,
    activateNode: activateNode,
    insertNodeData: insertNodeData,
    insertNodeCommand: insertNodeCommand,
    setNodeDescription: setNodeDescription,
    closeDB: closeDB,
	retrieveDataFromNodeAndDataId: retrieveDataFromNodeAndDataId,
	changeStateFromNodeAndDataId: changeStateFromNodeAndDataId,
	removeStateFromNodeId: removeStateFromNodeId,
	retrieveRules: retrieveRules,
	insertRule: insertRule,
    initDB: initDB
};

exports.db = export_functions;
