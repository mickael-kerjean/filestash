export default async function(ITable) {
    const module = await import("../../../lib/vendor/shp-to-geojson.browser.js");

    return class TableImpl extends ITable {
        constructor(response) {
            super();
            this.data = new module.DBase(module.Buffer.from(response));
        }

        getHeader() {
            return this.data.properties.map(({ fieldName, fieldLength }) => ({
                name: fieldName,
                size: fieldLength,
            }));
        }

        getBody() {
            const body = [];
            for (let i =0; i<this.data.recordLength; i++) {
                const row = this.data.getRowProperties(i);
                body.push(row);
            }
            return body;
        }
    };
}
