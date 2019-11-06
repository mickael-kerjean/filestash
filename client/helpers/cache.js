"use strict";

const DB_VERSION = 3,
      FILE_PATH = "file_path",
      FILE_CONTENT = "file_content";

function DataFromIndexedDB(){
    this.db = null;
    this.FILE_PATH = FILE_PATH;
    this.FILE_CONTENT = FILE_CONTENT;
    return this._init();
}
function DataFromMemory(){
    this.data = {};
    this.FILE_PATH = FILE_PATH;
    this.FILE_CONTENT = FILE_CONTENT;
    return this._init();
}

DataFromIndexedDB.prototype._init = function(){
    const request = indexedDB.open("filestash", DB_VERSION);
    request.onupgradeneeded = function(event){
        let store;
        let db = event.target.result;

        if(event.oldVersion == 1) {
            // we've change the schema on v2 adding an index, let's flush
            // to make sure everything will be fine
            db.deleteObjectStore(FILE_PATH);
            db.deleteObjectStore(FILE_CONTENT);
        }else if(event.oldVersion == 2){
            // we've change the primary key to be a (path,share)
            db.deleteObjectStore(FILE_PATH);
            db.deleteObjectStore(FILE_CONTENT);
        }

        store = db.createObjectStore(FILE_PATH, { keyPath: ["share", "path"] });
        store.createIndex("idx_path", ["share", "path"], { unique: true });

        store = db.createObjectStore(FILE_CONTENT, {keyPath: ["share", "path"]});
        store.createIndex("idx_path", ["share", "path"], { unique: true });
    };

    this.db = new Promise((done, err) => {
        request.onsuccess = (e) => {
            done(e.target.result);
        };
        request.onerror = (e) => err("INDEXEDDB_NOT_SUPPORTED");
    });
};
DataFromMemory.prototype._init = function(){
};

/*
 * Fetch a record using its path, can be either a file path or content
 */
DataFromIndexedDB.prototype.get = function(type, key){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction(type, "readonly");
        const store = tx.objectStore(type);
        const query = store.get(key);
        return new Promise((done, error) => {
            query.onsuccess = (e) => {
                let data = query.result;
                done(query.result || null);
            };
            query.onerror = () => done()
        });
    });
};
DataFromMemory.prototype.get = function(type, key){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    const data = this.data[type] || null;
    if(data === null){
        return Promise.resolve(null);
    }
    const value = data[key.join("_")] || null;
    if(value === null){
        return Promise.resolve(null);
    }
    return new Promise((done) => {
        requestAnimationFrame(() => done(value));
    });
};

DataFromIndexedDB.prototype.update = function(type, key, fn, exact = true){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);
        const range = exact === true? IDBKeyRange.only(key) : IDBKeyRange.bound(
            [key[0], key[1]],
            [key[0], key[1]+'\uFFFF'],
            false, true
        );
        const request = store.openCursor(range);
        let new_data = null;
        return new Promise((done, err) => {
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if(!cursor) return done(new_data);
                new_data = fn(cursor.value || null);
                cursor.delete([key[0], cursor.value.path]);
                store.put(new_data);
                cursor.continue();
            };
        });
    }).catch(() => Promise.resolve());
};
DataFromMemory.prototype.update = function(type, key, fn, exact = true){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    const data = this.data[type];
    if(data === undefined){
        return Promise.resolve(null);
    }

    const k = key.join("_");
    if(exact === true){
        if(this.data[type][k] !== undefined) this.data[type][k] = fn(data[k]);
    }else{
        for(let _k in data){
            if(_k.indexOf(k) === 0){
                this.data[type][_k] = fn(data[_k]);
            }
        }
    }
    return Promise.resolve();
};

DataFromIndexedDB.prototype.upsert = function(type, key, fn){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);
        const query = store.get(key);
        return new Promise((done, error) => {
            query.onsuccess = (e) => {
                const new_data = fn(query.result || null);
                if(!new_data) return done(query.result || null);

                const request = store.put(new_data);
                request.onsuccess = () => done(new_data);
                request.onerror = (e) => error(e);
            };
            query.onerror = error;
        });
    });
};
DataFromMemory.prototype.upsert = function(type, key, fn){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    const db = this.data[type] || null;
    if(db === null){
        this.data[type] = {};
    }
    const k = key.join("_");
    const new_data = fn(this.data[type][k]);
    this.data[type][k] = fn(new_data);
    return Promise.resolve(new_data);
};

DataFromIndexedDB.prototype.add = function(type, key, data){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    return this.db.then((db) => {
        return new Promise((done, error) => {
            const tx = db.transaction(type, "readwrite");
            const store = tx.objectStore(type);
            const request = store.put(data);
            request.onsuccess = () => done(data);
            request.onerror = (e) => error(e);
        });
    }).catch(() => Promise.resolve());
};
DataFromMemory.prototype.add = function(type, key, data){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    if(this.data[type] === undefined){
        this.data[type] = {};
    }
    this.data[type][key.join("_")] = data;
    return Promise.resolve(data);
};

DataFromIndexedDB.prototype.remove = function(type, key, exact = true){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);

        if(exact === true){
            const req = store.delete(key);
            return new Promise((done, err) => {
                req.onsuccess = () => done();
                req.onerror = err;
            });
        }else{
            const request = store.openCursor(IDBKeyRange.bound(
                [key[0], key[1]],
                [key[0], key[1]+'\uFFFF'],
                true, true
            ));
            return new Promise((done, err) => {
                request.onsuccess = function(event) {
                    const cursor = event.target.result;
                    if(cursor){
                        cursor.delete([key[0], cursor.value.path]);
                        cursor.continue();
                    }else{
                        done();
                    }
                };
            });
        }
    }).catch(() => Promise.resolve());
};
DataFromMemory.prototype.remove = function(type, key, exact = true){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    const data = this.data[type] || null;
    if(data === null){
        return Promise.resolve();
    }
    const k = key.join("_");
    if(exact === true){
        delete data[k];
    }
    for(let _k in data){
        if(_k.indexOf(k) === 0){
            delete data[_k];
        }
    }
    return Promise.resolve();
};

DataFromIndexedDB.prototype.fetchAll = function(fn, type = FILE_PATH, key){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    return this.db.then((db) => {
        const tx = db.transaction([type], "readonly");
        const store = tx.objectStore(type);
        const index = store.index("idx_path");
        const request = index.openCursor(IDBKeyRange.bound(
            [key[0], key[1]],
            [key[0], key[1]+("z".repeat(5000))]
        ));

        return new Promise((done, error) => {
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if(!cursor){
                    return done();
                }
                const ret = fn(cursor.value);
                if(ret === false){
                    return done();
                }
                cursor.continue();
            };
            request.onerror = () => {
                done();
            };
        });
    }).catch(() => Promise.resolve());
};
DataFromMemory.prototype.fetchAll = function(fn, type = FILE_PATH, key){
    if(type !== FILE_PATH && type !== FILE_CONTENT) return Promise.reject();

    const data = this.data[type] || null;
    if(data === null){
        return Promise.resolve();
    }
    const k = key.join("_");
    for(let _k in data){
        if(_k.indexOf(k) === 0){
            const ret = fn(data[_k]);
            if(ret === false){
                return Promise.resolve();
            }
        }
    }
    return Promise.resolve();
};

DataFromIndexedDB.prototype.destroy = function(){
    return new Promise((done, err) => {
        this.db.then((db) => {
            purgeAll(db, FILE_PATH);
            purgeAll(db, FILE_CONTENT);
        });
        done();

        function purgeAll(db, type){
            const tx = db.transaction(type, "readwrite");
            const store = tx.objectStore(type);
            store.clear();
        }
    });
};
DataFromMemory.prototype.destroy = function(){
    this.data = {};
    return Promise.resolve();
};

export let cache = new DataFromMemory();
if("indexedDB" in window && window.indexedDB !== null){
    var request = indexedDB.open("_indexedDB", 1);
    request.onsuccess = (e) => {
        cache = new DataFromIndexedDB();
        indexedDB.deleteDatabase("_indexedDB");
    };
}
