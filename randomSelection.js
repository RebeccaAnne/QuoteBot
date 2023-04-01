var fs = require("fs");

module.exports = {
    randomSelection: (guildId, arrayId, max) => {

        console.log("Random Selection!")
        let serverArrayFileName = "./arrays-" + guildId + ".json";

        let serverArrays = {};
        try {
            serverArrays = require(serverArrayFileName);
            console.log("Loaded serverArrays from file");
        }
        catch { console.log("Failed to load serverArrays from file"); }

        // Create a new array if:
        // (a) we don't have one
        // (b) the one we have is empty
        // (c) the max being passed is less than the one we used to generate the current array
        if ((serverArrays[arrayId] == null) ||
            (serverArrays[arrayId].length == 0) ||
            (max < serverArrays[arrayId + "Max"])) {

            console.log("Making a new Array!")
            serverArrays[arrayId] = new Array(max).fill().map((a, i) => a = i).sort(() => Math.random() - 0.5);
            serverArrays[arrayId + "Max"] = max;
            console.log(serverArrays);
        }
        // Expand the current array if the max we're being passed is greater than the one we used to 
        // generate the current array
        else if (max > serverArrays[arrayId + "Max"]) {
            let oldMax = serverArrays[arrayId + "Max"];
            let newItemsNeeded = max - oldMax;

            console.log("Expanding Array!")

            let newItems = new Array(newItemsNeeded).fill().map((a, i) => a = i + oldMax);
            serverArrays[arrayId] = [].concat(serverArrays[arrayId], newItems).sort(() => Math.random() - 0.5);
            serverArrays[arrayId + "Max"] = max;
            console.log(serverArrays);
        }

        // Pop an index off the random array
        let value = serverArrays[arrayId].pop();
        console.log("Returning index " + value);
        fs.writeFileSync(serverArrayFileName, JSON.stringify(serverArrays), () => { });
        return value;
    }
}
