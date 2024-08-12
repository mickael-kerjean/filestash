import fs from "fs";

function mainReorderKey(argv) {
    const filepath = argv[2];
    if (!filepath) throw new Error("missing args");

    let jsonStr = fs.readFileSync(filepath);
    const res = {};
    const obj = JSON.parse(jsonStr);
    Object.keys(obj).sort()
        .map((key) => res[key] = obj[key]);

    jsonStr = JSON.stringify(res, null, 4);
    fs.writeFileSync(filepath, jsonStr + "\n");
}

function mainAddTranslationKey(argv) {
    const key = argv[3];
    const filepath = argv[2];
    if (!filepath) throw new Error("missing args")
    else if (!key) return;

    const json = JSON.parse(fs.readFileSync(filepath));
    if (json[key] !== undefined) return;
    json[key] = "";
    fs.writeFileSync(filepath, JSON.stringify(json, null, 4) + "\n");
}

// usage: find *.json -type f -exec node script.js {} \;
(function() {
    mainAddTranslationKey(process.argv)
    mainReorderKey(process.argv)
})()
