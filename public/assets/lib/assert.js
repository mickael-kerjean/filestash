export default class assert {
    static type(object, type, msg) {
        if (!(object instanceof type)) throw new TypeError(msg || `assertion failed - unexpected type for ${object.toString()}`);
        return object;
    }

    static truthy(object, msg) {
        if (!object) throw new TypeError(msg || `assertion failed - object is not truthy`);
    }

    static fail(object, msg) {
        throw new TypeError(msg || `assertion failed - ${object}`);
    }
}
