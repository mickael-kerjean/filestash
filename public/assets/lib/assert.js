export default class assert {
    /**
     * @param {*} object
     * @param {Function} type
     * @param {string} [msg]
     * @return {*}
     * @throws {TypeError}
     */
    static type(object, type, msg) {
        if (!(object instanceof type)) throw new TypeError(msg || `assertion failed - unexpected type for ${object.toString()}`);
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
