var MongoClient = require('mongodb').MongoClient;
var mongo = require('mongodb');
var nconf = require('nconf');
nconf.env()
     .file({ file: 'config.json' });

var dbName = nconf.get('autofill:dbName');
var url = 'mongodb://' + nconf.get('mongo:host') + ':' +
          nconf.get('mongo:port') + '/' + dbName;

var exports = module.exports = {};

/** find(selector, collection, limit, callback)
 *
 * find a specified number of documents that match a certain selector.
 * returns an array of documents as JSON objects.
 *
 * selector    (JSON)  - document selector
 * collection (string) - the collection to search for documents
 * limit         (int) - number of documents to limit the search results to
 * callback     (func) - callback function to execute after completion
 */
exports.find = function(selector, collection, limit, callback) {
    var documents = [];

    var findDocs = function(db, collection, selector, callback) {
        var cursor = db.collection(collection).find(selector).limit(limit);
        cursor.each(function(err, doc) {
            if (err) {
                console.log('DB ERROR: mongo.findDocs() error response ' +
                            err + ' on ' + new Date().toUTCString());
                callback();
            }
            if (doc != null) {
                documents.push(doc);
            } else {
                callback();
            }
        });
    };

    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('DB ERROR: find() Mongo connection error ' +
                        err + ' on ' + new Date().toUTCString());
            callback(documents);
        }
        findDocs(db, collection, selector, function() {
            db.close();
            callback(documents);
        });
    });
};

/** insert(docs, collection, callback)
 *
 * insert any number of documents into a specific collection. returns the
 * results as a JSON object.
 *
 * docs (JSON or array)  - docs to insert. one JSON doc or array of JSON docs
 * collection   (string) - the collection to search for documents
 * callback       (func) - callback function to execute after completion
 */
exports.insert = function(docs, collection, callback) {
    var insertDoc = function(db, collection, doc, callback) {
        db.collection(collection).insertOne(doc, function(err, result) {
            if (err) {
                console.log('DB ERROR: mongo.insertDoc() error response ' +
                            err + ' on ' + new Date().toUTCString());
            }
            callback(result);
        });
    };

    var bulkInsert = function(db, collection, docs, callback) {
        var bulk = db.collection(collection).initializeUnorderedBulkOp();
        for (var i = 0; i < docs.length; i++) {
            bulk.insert(docs[i]);
        }

        bulk.execute(function(err, result) {
            if (err) {
                console.log('DB ERROR: mongo.bulkInsert() error response ' +
                            err + ' on ' + new Date().toUTCString());
            }
            callback(result);
        });
    };

    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('DB ERROR: insert() Mongo connection error ' +
                        err + ' on ' + new Date().toUTCString());
        }
        if(docs instanceof Array) {
            bulkInsert(db, collection, docs, function(result) {
                db.close();
                callback(result);
            });
        } else {
            insertDoc(db, collection, docs, function(result) {
                db.close();
                callback(result);
            });
        }
    });
};

/** edit(docs, collection, callback)
 *
 * edit a document with a specific _id. returns the result as a JSON object.
 *
 * id           (string) - document _id
 * changes        (JSON) - changes to be made in JSON notation
 * collection   (string) - the collection to search for documents
 * callback       (func) - callback function to execute after completion
 */
exports.edit = function(id, changes, collection, callback) {
    var changesMod = {};
    changesMod['$set'] = changes;

    var o_id = new mongo.ObjectID(id);
    var selector = {'_id': o_id};

    var editDoc = function(db, collection, selector, changes, callback) {
        db.collection(collection).updateOne(selector, changes,
        function(err, res) {
            if (err) {
                console.log('DB ERROR: mongo.editDoc() error response ' +
                            err + ' on ' + new Date().toUTCString());
            }
            callback(res);
        });
    };

    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('DB ERROR: edit() Mongo connection error ' +
                        err + ' on ' + new Date().toUTCString());
        }
        editDoc(db, collection, selector, changesMod, function(res) {
            db.close();
            callback(res);
        });
    });
};

/** delete(selector, collection, callback)
 *
 * delete any number of documents into a specific collection. returns the
 * results as a JSON object.
 *
 * selector       (JSON) - document selector
 * collection   (string) - the collection to search for documents
 * callback       (func) - callback function to execute after completion
 */
exports.delete = function(selector, collection, callback) {
    var deleteDoc = function(db, collection, selector, callback) {
        db.collection(collection).deleteOne(selector, function(err, res) {
            if (err) {
                console.log('DB ERROR: mongo.deleteDoc() error response ' +
                            err + ' on ' + new Date().toUTCString());
            }
            callback(res);
        });
    };

    var bulkDelete = function(db, collection, selector, callback) {
        var bulk = db.collection(collection).initializeUnorderedBulkOp();
        for (var i = 0; i < selector.length; i++) {
            bulk.find(selector[i]).removeOne();
        }

        bulk.execute(function(err, res) {
            if (err) {
                console.log('DB ERROR: mongo.bulkDelete() error response ' +
                            err + ' on ' + new Date().toUTCString());
            }
            callback(res);
        });
    };

    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('DB ERROR: delete() Mongo connection error ' +
                        err + ' on ' + new Date().toUTCString());
        }
        if(selector instanceof Array) {
            bulkDelete(db, collection, selector, function(res) {
                db.close();
                callback(res);
            });
        } else {
            deleteDoc(db, collection, selector, function(res) {
                db.close();
                callback(res);
            });
        }
    });
};

/** getIds(selector, collection, limit, callback)
 *
 * get the ids of a certain set of documents and returns them as an array of
 * strings. uses the find() function above. really just here to make
 * things a little bit easier. takes the same parameters as find().
 *
 * selector     (JSON) - document selector
 * collection (string) - the collection to search for documents
 * limit         (int) - number of documents to limit the search results to
 * callback     (func) - callback function to execute after completion
 */
exports.getIds = function(selector, collection, limit, callback) {
    var ids = [];

    exports.find(collection, selector, limit, function(docs) {
        for (var i = 0; i < docs.length; i++) {
            if (docs[i]._id) {
                ids.push(docs[i]._id);
            }
        }
        callback(ids);
    });
};

/** get(id, collection, callback)
 *
 * fetches a document with a certain _id. returns the document as a JSON object.
 *
 * id         (string) - document _id
 * collection (string) - the collection to search for documents
 * callback     (func) - callback function to execute after completion
 */
exports.get = function(id, collection, callback) {
    var o_id = new mongo.ObjectID(id);
    var selector = {'_id': o_id};
    var foundOne = false;

    var getDoc = function(db, id, collection, callback) {
        var cursor = db.collection(collection).find(selector);
        cursor.each(function(err, doc) {
            if (err) {
                console.log('DB ERROR: mongo.getDoc() error response ' +
                            err + ' on ' + new Date().toUTCString());
            }
            if (doc != null) {
                foundOne = true;
                callback(doc);
            }
            // cursor.each() is always going to hit a null value so keep track
            // of whether or not we've found one. console out on lookup failure
            if (!foundOne){
                console.log('DB ERROR: Document not found with id: \'' +
                            id + '\' on ' + new Date().toUTCString());
                callback(doc);
            }
        });
    };

    MongoClient.connect(url, function(err, db) {
        if (err) {
            console.log('DB ERROR: get() Mongo connection error ' +
                        err + ' on ' + new Date().toUTCString());
        }
        getDoc(db, id, collection, function(doc) {
            db.close();
            callback(doc);
        });
    });
};
