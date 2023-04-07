var fs = require("fs");
const dayjs = require('dayjs');
 
let logDateStamp = 0;
let logStream;

module.exports = {
    logString: async (logString) => {

        console.log(logString);

        if (logDateStamp == 0) {
            logDateStamp = Date.now();
            logStream = fs.createWriteStream("./log-" + logDateStamp + ".txt", { flags: 'a' });
        }
        let logTime = dayjs();
        logStream.write(logTime.format("YYYY-MM-DD h:mm") + "\t" + logString + "\n");
    }
}