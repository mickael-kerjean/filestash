"use strict";

function Data(){
    this.FILE_PATH = "file_path";
    this.FILE_CONTENT = "file_content";
    this.db = null;
    this._init();
}

Data.prototype._init = function(){
    const request = window.indexedDB.open('nuage', 1);
    request.onupgradeneeded = (e) => this._setup(e.target.result);

    this.db = new Promise((done, err) => {
        request.onsuccess = (e) => {
            done(e.target.result);
        }
        request.onerror = (e) => {
            err(e);
        };
    });
}

Data.prototype._setup = function(db){
    let store;
    if(!db.objectStoreNames.contains(this.FILE_PATH)){
        store = db.createObjectStore(this.FILE_PATH, {keyPath: "path"});
    }

    if(!db.objectStoreNames.contains(this.FILE_CONTENT)){
        store = db.createObjectStore(this.FILE_CONTENT, {keyPath: "path"});
    }
}

/*
 * Fetch a record using its path, can be whether a file path or content
 */
Data.prototype.get = function(type, path){
    if(type !== this.FILE_PATH && type !== this.FILE_CONTENT) return Promise.reject({});

    return this.db.then((db) => {
        const tx = db.transaction(type, "readonly");
        const store = tx.objectStore(type);
        const query = store.get(path);
        return new Promise((done, error) => {
            query.onsuccess = (e) => {
                let data = query.result;
                done(query.result || null);
            };
            query.onerror = error;
        });
    });
}

Data.prototype.update = function(type, path, fn, exact = true){
    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);
        const range = exact === true? IDBKeyRange.only(path) : IDBKeyRange.bound(
            path,
            path+'\uFFFF',
            false, true
        );
        const request = store.openCursor(range);
        let new_data = null;
        return new Promise((done, err) => {
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if(!cursor) return done(new_data);
                new_data = fn(cursor.value || null);
                cursor.delete(cursor.value.path);
                store.put(new_data);
                cursor.continue();
            };
        });
    });
}


Data.prototype.upsert = function(type, path, fn){
    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);
        const query = store.get(path);
        return new Promise((done, error) => {
            query.onsuccess = (e) => {
                const new_data = fn(query.result || null);
                if(!new_data) return done(query.result);

                const request = store.put(new_data);
                request.onsuccess = () => done(new_data);
                request.onerror = (e) => error(e);
            };
            query.onerror = error;
        });
    });
}

Data.prototype.add = function(type, path, data){
    if(type !== this.FILE_PATH && type !== this.FILE_CONTENT) return Promise.reject({});

    return this.db.then((db) => {
        return new Promise((done, error) => {
            const tx = db.transaction(type, "readwrite");
            const store = tx.objectStore(type);
            const request = store.put(data);
            request.onsuccess = () => done(data);
            request.onerror = (e) => error(e);
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
            const request = store.openCursor(IDBKeyRange.bound(
                path,
                path+'\uFFFF',
                true, true
            ));
            return new Promise((done, err) => {
                request.onsuccess = function(event) {
                    const cursor = event.target.result;
                    if(cursor){
                        cursor.delete(cursor.value.path);
                        cursor.continue();
                    }else{
                        done();
                    }
                };
            });
        }
    });
}

Data.prototype.fetchAll = function(fn, type = this.FILE_PATH){
    return this.db.then((db) => {
        const tx = db.transaction(type, "readwrite");
        const store = tx.objectStore(type);
        const request = store.openCursor();

        return new Promise((done, error) => {
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if(!cursor) return done();
                const new_value = fn(cursor.value);
                cursor.continue();
            };
        });
    });
}

Data.prototype.destroy = function(){
    this.db.then((db) => db.close())
    clearTimeout(this.intervalId);
    window.indexedDB.deleteDatabase('nuage');
    this._init();
}


export const cache = new Data();
window._cache = cache;
