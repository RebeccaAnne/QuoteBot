var fs = require("fs");

let oldCacheFilename = "./BingoSpotlight.json"
let newCacheFilename = "./BingoSpotlight - Ids.json"

let oldFicCache = require(oldCacheFilename);
let newFicCache = {}

getFicId = (ficLink) => {
    const ao3Link = "https://archiveofourown.org/works/"
    return ficLink.slice(ao3Link.length);
}
oldFicCache.forEach(fic => {
    console.log(fic.title)

    let ficId = getFicId(fic.link);
    
    newFicCache[ficId] = fic;
});

console.log(newFicCache)

fs.writeFileSync(newCacheFilename, JSON.stringify(newFicCache), () => { });