"use strict";
// window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
// window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"}; // This line should only be needed if it is needed to support the object's constants for older browsers
// window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

function Data(){
    this.FILE_PATH = "file_path";
    this.FILE_CONTENT = "file_content";
    this.db_version = 'v1.1';
    this.db = null;
    this.intervalId = window.setInterval(this._vacuum.bind(this), 5000);
    this._init();
}

Data.prototype._init = function(){
    const request = window.indexedDB.open('nuage', 1);
    request.onupgradeneeded = (e) => this._setup(e.target.result);

    this.db = new Promise((done, err) => {
        request.onsuccess = (e) => {
            done(e.target.result);
        }
        request.onerror = err;
    });
}

Data.prototype._setup = function(db){
    let store;
    if(!db.objectStoreNames.contains(this.FILE_PATH)){
        store = db.createObjectStore(this.FILE_PATH, {keyPath: "path"});
    }
    //store.createIndex("stale", ["last_access"])

    if(!db.objectStoreNames.contains(this.FILE_CONTENT)){
        store = db.createObjectStore(this.FILE_CONTENT, {keyPath: "path"});
    }
    //store.createIndex("stale", ["last_access"])
}

Data.prototype._vacuum = function(){

}

/*
 * Fetch a record using its path, can be whether a file path or content
 */
Data.prototype.get = function(type, path, _should_update = true){
    if(type !== this.FILE_PATH && type !== this.FILE_CONTENT) return Promise.reject({});
    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);
        const query = store.get(path);
        return new Promise((done, error) => {
            query.onsuccess = (e) => {
                let data = query.result || null;
                done(data);
                if(data && _should_update === true){
                    requestAnimationFrame(() => {
                        data.last_access = new Date();
                        if(!data.access_count) data.access_count = 0;
                        data.access_count += 1;
                        this.put(type, data.path, data);
                    });
                }
            };
            tx.onerror = error;
        });
    });
}

Data.prototype.put = function(type, path, data){
    if(type !== this.FILE_PATH && type !== this.FILE_CONTENT) return Promise.reject({});

    return this.get(type, path, false)
        .then((res) => {
            let new_data;
            if(res === null){
                new_data = data;
                new_data.last_update = new Date();
                new_data.path = path;
            }else{
                new_data = Object.assign(res, data);
                new_data.last_update = new Date();
            }

            return this.db.then((db) => {
                const tx = db.transaction(type, "readwrite");
                const store = tx.objectStore(type);

                return new Promise((done, error) => {
                    let request = store.put(new_data);
                    request.onsuccess = () => done(new_data.result || new_data.results);
                    request.onerror = (e) => error(e);
                    tx.onerror = (e) => error(e);
                    tx.oncomplete = () => done(new_data.result || new_data.results);
                });
            });
        });
}

Data.prototype.remove = function(type, path, exact = true){
    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);

        if(exact === true){
            const req = store.delete(path);
            return new Promise((done, err) => {
                req.onsuccess = () => done();
                req.onerror = err;
            });
        }else{
            const request = store.openCursor();
            return new Promise((done, err) => {
                request.onsuccess = function(event) {
                    const cursor = event.target.result;
                    if(cursor){
                        if(cursor.value.path.indexOf(path) === 0){
                            store.delete(cursor.value.path);
                        }
                        cursor.continue();
                    }else{
                        done();
                    }
                };
            });
        }
    });
}

Data.prototype.update_path = function(updater_fn){
    this.db.then((db) => {
        const tx = db.transaction(this.FILE_PATH, "readwrite");
        const store = tx.objectStore(this.FILE_PATH);
        const request = store.openCursor();
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if(cursor){
                updater_fn(cursor.value, store)
                cursor.continue();
            }
        };

    });
}
Data.prototype.update_content = function(updater_fn){
    this.db.then((db) => {
        const tx = db.transaction(this.FILE_CONTENT, "readwrite");
        const store = tx.objectStore(this.FILE_CONTENT);
        const request = store.openCursor();
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if(cursor){
                const action = updater_fn(cursor.value, store);
                cursor.continue();
            }
        };

    });
}

Data.prototype.destroy = function(){
    this.db.then((db) => db.close())
    clearTimeout(this.intervalId);
    window.indexedDB.deleteDatabase('nuage');
    this._init();
}


// // test
// cache = new Data();
// cache.put(cache.FILE_PATH, '/', {a:3});
// cache.get(cache.FILE_PATH, '/').then((r) => {
//     console.log(r);
//     cache.remove(cache.FILE_PATH, '/');
//     cache.get(cache.FILE_PATH, '/').then((r) => {
//         console.log(r);
//         //cache.destroy();
//     });
// });


export const cache = new Data();
window.test = cache;
