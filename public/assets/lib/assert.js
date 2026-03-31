export default class assert {
    /**
     * @param {*} object
     * @param {Function} type
     * @param {string} [msg]
     * @return {*}
     * @throws {TypeError}
     */
    static type(object, type, msg) {
        if (object === undefined) throw new TypeError(msg || "assertion failed - undefined object");
        if (!(object instanceof type)) throw new TypeError(msg || `assertion failed - unexpected type for ${JSON.stringify(object)}`);
        return object;
    }

    /**
     * @param {*} object
     * @param {string} type
     * @param {string} [msg]
     * @return {*}
     * @throws {TypeError}
     */
    static typeof(object, type, msg) {
        if (typeof object !== type) throw new TypeError(msg || `assertion failed - unexpected type for ${JSON.stringify(object)}`); // eslint-disable-line valid-typeof
        return object;
    }

    /**
     * @param {*} object
     * @param {string} [msg]
     * @return {*}
     * @throws {TypeError}
     */
    static truthy(object, msg) {
        if (!object) throw new TypeError(msg || `assertion failed - object is not truthy`);
        return object;
    }

    /**
     * @param {string} msg
     * @throws {TypeError}
     */
    static fail(msg) {
        throw new TypeError(msg);
    }
}
