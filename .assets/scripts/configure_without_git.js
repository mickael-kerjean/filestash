const fs = require("fs"),
      path = require("path");

const lines = fs.readFileSync(path.join(__dirname, "../../config_client.js"))
      .toString()
      .split("\n");

let isGitBlock = false;
for(let i=0, l=lines.length; i<l; i++){
    let tmp;
    if(lines[i].trim() === "git: {") isGitBlock = true;
    else if(lines[i].trim() === "},") tmp = false;

    if(isGitBlock === true) lines[i] = "//"+lines[i];

    if(tmp === false) isGitBlock = false;
}

fs.writeFileSync(path.join(__dirname, "../../config_client.js"), lines.join("\n"));
