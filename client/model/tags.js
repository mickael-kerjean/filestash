// This is a WIP: tags are stored in indexedDB like this:
// {
//    tag: "name",
//    path: "/test/"
//    share: "",
//    backend: "__hash__",
// }

class TagManager {
    getAll(path = "/") {
        // TODO: path could be: /tagA/tagB/tagC
        // meaning we get whatever is matching tagA,B,C
        // return Promise.resolve(["project", "test"])
        return Promise.resolve([]);
    }
}

export const Tags = new TagManager();
