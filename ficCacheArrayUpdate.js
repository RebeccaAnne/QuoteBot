var fs = require("fs");

let oldCacheFilename = "./Nine Worlds Series - Victoria Goddard-old.json"
let newCacheFilename = "./Nine Worlds Series - Victoria Goddard.json"
let fileToUpdate = "./arrays-1264447528481325086.json"
let arrayName = "Nine Worlds Series - Victoria Goddard"

getFicId = (ficLink) => {
    const ao3Link = "https://archiveofourown.org/works/"
    return ficLink.slice(ao3Link.length);
}

updateFicCacheArray = async () => {

    let arrayFile = require(fileToUpdate);
    let oldArray = arrayFile[arrayName]

    // Sort the array so it's easier to see what's happening
    oldArray.sort(function (a, b) { return a - b });
    let newArray = oldArray.slice();

    let oldFicCache = require(oldCacheFilename);
    let newFicCache = require(newCacheFilename);

    let iOldIndex = 0;
    let iNewIndex = 0;

    while (iOldIndex < oldFicCache.length) {
        let oldFicId = getFicId(oldFicCache[iOldIndex].link);
        let newFicId = getFicId(newFicCache[iNewIndex].link);

        console.log("oldFicId = " + oldFicId + "; newFicId = " + newFicId);

        if (oldFicId == newFicId) {
            console.log("Fic " + oldFicId + " unchanged")
            iNewIndex++;
            iOldIndex++;
            continue;
        }

        if (Number(oldFicId) < Number(newFicId)) {
            console.log(oldFicId + " deleted!")

            // The fic at iOldIndex has been deleted. Update the array by: 

            // (1) removing that index if present
            newArray = newArray.filter(function (index) {
                if (index == iOldIndex) {
                    console.log("Removing index " + iOldIndex)
                }
                return index != iOldIndex;
            })

            // (2) decreasing the index of all items at later indices  
            newArray = newArray.map(function (index) {
                if (index > iOldIndex) {
                    console.log("Changing index " + index + " to " + (index - 1))
                    return index - 1;
                }
                else {
                    return index;
                }
            })

            iOldIndex++;
        }
        else {
            console.log(newFicId + " added!")

            // The fic at iNewIndex has been inserted. Update the array by 

            // (1) Increasing the value of all items at that index or later   
            newArray = newArray.map(function (index) {
                if (index >= iNewIndex) {
                    console.log("Changing index " + index + " to " + (index + 1))
                    return index + 1;
                }
                else {
                    return index;
                }
            })

            // (2) Add that index to the array  
            console.log("Adding index " + iNewIndex)
            newArray.push(iNewIndex);

            iNewIndex++;
        }
    }

    // We've reached the end of the old cache, but there may be more in the new cache
    while (iNewIndex < newFicCache.length) {
        let newFicId = getFicId(newFicCache[iNewIndex].link);
        console.log("newFicId = " + newFicId + " added!");
        console.log("Adding index " + iNewIndex)
        newArray.push(iNewIndex);
        iNewIndex++;
    }

    let arrayUpdates = {};
    
    // The old array (already sorted)
    arrayUpdates.oldArraySorted = oldArray;

    // The new array 
    arrayUpdates.newArray = newArray;

    // The new array re-randomised
    arrayUpdates.newArrayRandomized = newArray.slice();
    arrayUpdates.newArrayRandomized.sort(function (a, b) { return Math.random() - 0.5 });
    arrayUpdates.newArraySize = newFicCache.length;

    arrayFile[arrayName] = arrayUpdates.newArrayRandomized;
    arrayFile[arrayName + "Max"] = arrayUpdates.newArraySize;


    fs.writeFileSync("ArrayUpdates.json", JSON.stringify(arrayUpdates), () => { });
    fs.writeFileSync(fileToUpdate, JSON.stringify(arrayFile), () => { });
}

updateFicCacheArray();