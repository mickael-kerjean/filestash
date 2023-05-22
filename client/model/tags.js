import { cache, currentShare, currentBackend } from "../helpers/";

class TagManager {
    all(tagPath = "/") {
        return cache.get(cache.FILE_TAG, [currentBackend(), currentShare()]).then((DB) => {
            if (DB === null) {
                return [];
            }
            const tags = this._tagPathStringToArray(tagPath);
            if (tags.length === 0) {
                return Object.keys(DB.tags);
            }

            // STEP1: build the graph of selected tags

            // STEP2: build the node that connects to the initial graph
            return Object.keys(DB.tags)
                .map((tag) => {
                    if (tags.indexOf(tag) !== -1) { // ignore tag that are already selected
                        return { tag, scrore: 0 };
                    }
                    return {
                        tag,
                        score: DB.tags[tag].reduce((path, acc) => {
                            // TODO
                            return acc;
                        }, 0),
                    }
                })
                .filter((t) => t && t.score > 0)
                .sort((a, b) => a.score > b.score)
                .map((d) => d.tag);
        });
    }

    files(tagPath) {
        let tags = this._tagPathStringToArray(tagPath);

        return cache.get(cache.FILE_TAG, [currentBackend(), currentShare()]).then((DB) => {
            if (!DB) return [];
            else if (!DB.tags) return [];
            else if (tags.length === 0) tags = Object.keys(DB.tags);

            // push all the candidates in an array
            let paths = (DB.tags[tags[0]] || []).map((t) => ({path: t, tag: tags[0]}));
            for (let i=1; i<tags.length; i++) {
                const tp = DB.tags[tags[i]];
                if (!tp) continue;
                paths = paths.concat(tp.map((t) => ({path: t, tag: tags[i]})));
            }

            // mark element of the array that shouldn't be here
            return paths;
        });
    }

    _tagPathStringToArray(tagPathString) {
        return tagPathString.split("/").filter((r) => r !== "");
    }

    addTagToFile(tag, path) {
        return cache.upsert(cache.FILE_TAG, [currentBackend(), currentShare()], (DB) => {
            if(Object.keys(DB.tags).indexOf(tag) === -1) {
                DB.tags[tag] = [];
            }
            if(!DB.tags[tag].indexOf(path) === -1) {
                DB.tags[tag].push(path);
            }
            return DB;
        });
    }

    removeTagFromFile(tag, path) {
        return cache.upsert(cache.FILE_TAG, [currentBackend(), currentShare()], (DB) => {
            if(!DB.tags[tag]) return;
            const idx = DB.tags[tag].indexOf(path);
            DB.tags[tag].splice(idx, 1);
            if (DB.tags[tag].length === 0) {
                delete DB.tags[tag];
            }
            return DB;
        });
    }

    import(DB) {
        if(JSON.stringify(Object.keys(DB)) !== JSON.stringify(["tags", "share", "backend"])) {
            return Promise.reject(new Error("Not Valid"));
        }
        return cache.upsert(cache.FILE_TAG, [currentBackend(), currentShare()], () => {
            return DB;
        });
    }

    export() {
        const key = [currentBackend(), currentShare()];
        return cache.get(cache.FILE_TAG, key)
            .then((a) => {
                if (a === null) {
                    return {tags: {}, share: key[1], backend: key[0]}
                }
                return a;
            });
    }
}

export const Tags = new TagManager();
