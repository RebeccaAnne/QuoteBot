var fs = require("fs");
const dayjs = require('dayjs');

let logDateStamp = 0;
let logStream;

module.exports = {
    logString: async (logString, file) => {

        let logTimeString = dayjs().format("YYYY-MM-DD h:mm") + "\t";

        console.log(logTimeString + logString);

        if (file) {
            console.log("We have a file: " + file);
            let fileLogStream = fs.createWriteStream(file, { flags: 'a' });

            fileLogStream.write(logTimeString + logString + "\n");
        }
        else {
            if (logDateStamp == 0) {
                logDateStamp = Date.now();
                logStream = fs.createWriteStream("./log-" + logDateStamp + ".txt", { flags: 'a' });
            }
            logStream.write(logTimeString + logString + "\n");
        }
    }
}