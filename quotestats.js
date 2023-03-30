const { quote } = require("discord.js");
var fs = require("fs");
const path = require('node:path');

const rootFileName = process.argv[2];
const rootName = process.argv[3];

const rootFile = require(rootFileName);

var booksReported = {};

console.log(rootFileName);
console.log(rootName);

rootFile[rootName].forEach(book => {

    //if we haven't come across this book before, report stats
    if (booksReported[book] == null) {
        booksReported[book] = {};

        // Get the  book item 
        const bookItem = rootFile[book];
        let bookQuoteFile = require(path.join(__dirname, "data/" + bookItem.quoteSourceFile));

        console.log('\x1b[36m%s\x1b[0m', bookItem.title);  //cyan
        let count = 0;
        let totalLength = 0;

        bookQuoteFile[book + "quotes"].forEach(quoteObject => {

            let twitterQuote = "";

            // Check the tweet length
            // A tweet is made up of the quote, two newlines, and the title
            totalLength += quoteObject.quote.length;
            count++;
        });
        console.log(count + " total quotes");
        console.log(Math.floor(totalLength/count) + " average quote length");
    }
});
