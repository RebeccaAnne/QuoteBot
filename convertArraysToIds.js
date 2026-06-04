var fs = require("fs");

let araryFilename = "./arrays-1071247508732395550.json"
let oldCacheFilename = "./Nine Worlds Series - Victoria Goddard.json"

let arrayFile = require(araryFilename)
let oldFicCache = require(oldCacheFilename);

getFicId = (ficLink) => {
    const ao3Link = "https://archiveofourown.org/works/"
    return ficLink.slice(ao3Link.length);
}

let idArray = [];

arrayFile["Nine Worlds Series - Victoria Goddard"].forEach(index => {
    let id = getFicId(oldFicCache[index].link)
    idArray.push(id)
});

arrayFile["Nine Worlds Series - Victoria Goddard"] = idArray;

fs.writeFileSync(araryFilename, JSON.stringify(arrayFile), () => { });