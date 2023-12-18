export default class assert {
    static type(object, type) {
        if (object instanceof type) return;
        throw new Error(`assertion failed - unexpected type for ${object.toString()}`);
    }

    static truthy(object) {
        if (object) return;
        throw new Error(`assertion failed - object is not truthy`);
    }

    static fail(object) {
        throw new Error(`assertion failed - ${object}`);
    }
}
