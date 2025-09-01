var fs = require("fs");
const { logString } = require('./logging');

module.exports = {
    randomIndexSelection: (guildId, arrayId, max, updateOnNewItems, regenOnEmpty = true) => {

        logString("Random Selection!")

        // Short circuit everything if they're asking for an index from an array of size 1.
        if (max == 1) {
            return 0;
        }

        let serverArrayFileName = "./arrays-" + guildId + ".json";

        let serverArrays = {};
        try {
            serverArrays = require(serverArrayFileName);
        }
        catch { logString("Failed to load serverArrays from file"); }

        // Create a new array if:
        // (a) we don't have one
        // (b) the one we have is empty
        // (c) the max being passed is less than the one we used to generate the current array
        if ((serverArrays[arrayId] == null) ||
            (serverArrays[arrayId].length == 0 && regenOnEmpty) ||
            (max < serverArrays[arrayId + "Max"])) {

            logString("Making a new Array! Server: " + guildId + " Id: " + arrayId + " max: " + max, "./arrayUpdateLog.txt");
            serverArrays[arrayId] = new Array(max).fill().map((a, i) => a = i).sort(() => Math.random() - 0.5);
            serverArrays[arrayId + "Max"] = max;
        }
        // Expand the current array if the max we're being passed is greater than the one we used to 
        // generate the current array
        else if (updateOnNewItems &&
            (max > serverArrays[arrayId + "Max"])) {

            let oldMax = serverArrays[arrayId + "Max"];
            let newItemsNeeded = max - oldMax;

            logString("Expanding Array! Server: " + guildId + " Id:" + arrayId + " oldMax: " + oldMax + " newMax: " + max, "./arrayUpdateLog.txt");

            let newItems = new Array(newItemsNeeded).fill().map((a, i) => a = i + oldMax);
            serverArrays[arrayId] = [].concat(serverArrays[arrayId], newItems).sort(() => Math.random() - 0.5);
            serverArrays[arrayId + "Max"] = max;
        }

        // Pop an index off the random array
        let value = serverArrays[arrayId].pop();
        logString("Returning index " + value);
        fs.writeFileSync(serverArrayFileName, JSON.stringify(serverArrays), () => { });
        return value;
    }
}
