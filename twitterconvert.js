const { quote } = require("discord.js");
var fs = require("fs");
const path = require('node:path');

const rootFileName = process.argv[2];
const rootName = process.argv[3];

const rootFile = require(rootFileName);

var twitterResult = {};
twitterResult.origin = [];

console.log(rootFileName);
console.log(rootName);

rootFile[rootName].forEach(book => {

    // Get the book from the top level array
    twitterResult.origin.push("#" + book + "#");

    // Get the  book item 
    const bookItem = rootFile[book];
    let bookQuoteFile = require(path.join(__dirname, "data/" + bookItem.quoteSourceFile));

    // Add it to the twitter result surrounded by #'s. This is to support tracery as used by Cheap Bots Done Quick
    twitterResult[book] = ["#" + book + "quotes#\n\n" + bookItem.title];

    // If we haven't come across this book before, create the quote array for it.
    if (twitterResult[book + "quotes"] == null) {
        twitterResult[book + "quotes"] = [];

        console.log(bookItem.title);
        let count = 0;

        bookQuoteFile[book + "quotes"].forEach(quoteObject => {

            let twitterQuote = "";

            // If we have a specialy editted twitter quote, use that
            if (quoteObject.twitterQuote != null) {
                twitterQuote = quoteObject.twitterQuote;
            }
            else {
                // If we're using the discord quote, we need to remove any formatting.
                // Italics are marked for discord by surrounding text with *, underlines with __. 
                // This strips those characters for twitter. We'll need to do something more
                // sophisticated here if the source text starts including those characters, but
                // for now this gets the job done.
                twitterQuote = quoteObject.quote.replace(/[*]/g, '').replace(/[__]/g, '');
            }

            // Check the tweet length
            // A tweet is made up of the quote, two newlines, and the title
            let tweetLength = twitterQuote.length + 2 + bookItem.title.length;
            if (tweetLength > 280) {
                console.log("++++++\nQuote Too Long!\n" +
                    tweetLength + " characters!\n" +
                    twitterQuote + "\n\n" +
                    bookItem.title + "\n++++++");
            }

            twitterResult[book + "quotes"].push(twitterQuote);
            count++;
        });
        console.log(count + " quotes converted")
    }
});

let createStream = fs.createWriteStream("twitterQuotes.json");
createStream.write(JSON.stringify(twitterResult));
createStream.end();