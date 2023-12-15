export default class assert {
    static type(object, type) {
        if (object instanceof type) return;
        throw new Error(`assertion failed - unexpected type for ${object.toString()}`);
    }
}
