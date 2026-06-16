var fs = require("fs");

let araryFilename = "./arrays-1182155789897584681.json"
let oldCacheFilename = "./Tuyo Series- Rachel Neumeier-old.json"

let arrayFile = require(araryFilename)
let oldFicCache = require(oldCacheFilename);

getFicId = (ficLink) => {
    const ao3Link = "https://archiveofourown.org/works/"
    return ficLink.slice(ao3Link.length);
}

let idArray = [];

arrayFile["Tuyo Series- Rachel Neumeier"].forEach(index => {
    let id = getFicId(oldFicCache[index].link)
    idArray.push(id)
});

arrayFile["Tuyo Series- Rachel Neumeier"] = idArray;

fs.writeFileSync(araryFilename, JSON.stringify(arrayFile), () => { });