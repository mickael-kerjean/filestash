import assert from "../../../lib/assert.js";
import loadWASM, { writeFS, readFS } from "../../../helpers/loader_wasm.js";

export default async function(ITable) {
    const { instance } = await loadWASM(import.meta.url, "./loader_symbol.wasm");

    return class TableImpl extends ITable {
        constructor(response) {
            super();
            const fdIn = writeFS(new Uint8Array(response));
            const fdOut = writeFS(new Uint8Array([]));
            const res = assert.truthy(instance.exports["execute"])(fdIn, fdOut);
            if (res !== 0) throw new Error(`WASM exited with code=${res}`);
            const buffer = readFS(fdOut);

            this.header = [
                { name: "Mode", size: 3 },
                { name: "Timestamp", size: 6 },
                { name: "Size", size: 4 },
                { name: "Owner", size: 6 },
                { name: "Group", size: 6 },
                { name: "Object", size: 40 },
            ];
            this.rows = new TextDecoder().decode(buffer).trimRight().split("\n").map((line) => {
                const row = line.split(",");
                return {
                    "Object": row[0],
                    "Timestamp": row[1],
                    "Size": row[5],
                    "Mode": row[4],
                    "Owner": row[2],
                    "Group": row[3],
                };
            });
        }

        getHeader() {
            return this.header;
        }

        getBody() {
            return this.rows;
        }
    };
}
