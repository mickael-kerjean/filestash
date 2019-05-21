"use strict";

function Data(){
    this.FILE_PATH = "file_path";
    this.FILE_CONTENT = "file_content";
    this.db = null;
    this._init();
}

const DB_VERSION = 3;

Data.prototype._init = function(){
    const request = indexedDB.open('filestash', DB_VERSION);
    request.onupgradeneeded = (e) => this._setup(e);

    this.db = new Promise((done, err) => {
        request.onsuccess = (e) => {
            done(e.target.result);
        }
        request.onerror = (e) => {
            err(e);
        };
    });
}

Data.prototype._setup = function(e){
    let store;
    let db = e.target.result;

    if(e.oldVersion == 1) {
        // we've change the schema on v2 adding an index, let's flush
        // to make sure everything will be fine
        db.deleteObjectStore(this.FILE_PATH);
        db.deleteObjectStore(this.FILE_CONTENT);
    }else if(e.oldVersion == 2){
        // we've change the primary key to be a (path,share)
        db.deleteObjectStore(this.FILE_PATH);
        db.deleteObjectStore(this.FILE_CONTENT);
    }

    store = db.createObjectStore(this.FILE_PATH, {keyPath: ["share", "path"]});
    store.createIndex("idx_path", ["share", "path"], { unique: true });

    store = db.createObjectStore(this.FILE_CONTENT, {keyPath: ["share", "path"]});
    store.createIndex("idx_path", ["share", "path"], { unique: true });
}

/*
 * Fetch a record using its path, can be whether a file path or content
 */
Data.prototype.get = function(type, key){
    if(type !== this.FILE_PATH && type !== this.FILE_CONTENT) return Promise.reject({});

    return this.db.then((db) => {
        const tx = db.transaction(type, "readonly");
        const store = tx.objectStore(type);
        const query = store.get(key);
        return new Promise((done, error) => {
            query.onsuccess = (e) => {
                let data = query.result;
                done(query.result || null);
            };
            query.onerror = error;
        });
    }).catch(() => Promise.resolve(null));
}

Data.prototype.update = function(type, key, fn, exact = true){
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
    }).catch(() => Promise.resolve(null));
}


Data.prototype.upsert = function(type, key, fn){
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
}

Data.prototype.add = function(type, key, data){
    if(type !== this.FILE_PATH && type !== this.FILE_CONTENT) return Promise.reject({});

    return this.db.then((db) => {
        return new Promise((done, error) => {
            const tx = db.transaction(type, "readwrite");
            const store = tx.objectStore(type);
            const request = store.put(data);
            request.onsuccess = () => done(data);
            request.onerror = (e) => error(e);
        });
    }).catch(() => Promise.resolve(null));
}

Data.prototype.remove = function(type, key, exact = true){
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
    }).catch(() => Promise.resolve(null));
}

Data.prototype.fetchAll = function(fn, type = this.FILE_PATH, key){
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
            }
        });
    }).catch(() => Promise.resolve(null));
}

Data.prototype.destroy = function(){
    clearTimeout(this.intervalId);
    return new Promise((done, err) => {
        this.db.then((db) => {
            purgeAll(db, this.FILE_PATH);
            purgeAll(db, this.FILE_CONTENT);
        });
        done();

        function purgeAll(db, type){
            const tx = db.transaction(type, "readwrite");
            const store = tx.objectStore(type);
            store.clear();
        }
    });
}

export const cache = new Data();
