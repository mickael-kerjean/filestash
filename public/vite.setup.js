import {
    describe, it, test, expect, vi,
    afterEach, afterAll, beforeEach, beforeAll,
} from "vitest";

global.nextTick = () => new Promise((done) => setTimeout(done, 0));
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);

global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;
global.beforeEach = beforeEach;
global.beforeAll = beforeAll;
global.afterEach = afterEach;
global.afterAll = afterAll;
