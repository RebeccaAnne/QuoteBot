const { quote } = require("discord.js");
var fs = require("fs");

const quoteFileName = process.argv[2];
const rootName = process.argv[3];

const quoteFile = require(quoteFileName);

var twitterResult = {};
twitterResult.origin = [];

quoteFile[rootName].forEach(book => {

    // Get the book from the top level array
    twitterResult.origin.push("#" + book + "#");

    // Get the  book item 
    const bookItem = quoteFile[book];

    // Add it to the twitter result surrounded by #'s. This is to support tracery as used by Cheap Bots Done Quick
    twitterResult[book] = ["#" + book + "quotes#\n\n" + bookItem.title];

    // If we haven't come across this book before, create the quote array for it.
    if (twitterResult[book + "quotes"] == null) {
        twitterResult[book + "quotes"] = [];

        quoteFile[book + "quotes"].forEach(quoteObject => {

            let twitterQuote = "";

            // If we have a specialy editted twitter quote, use that
            if (quoteObject.twitterQuote != null) {
                twitterQuote = quoteObject.twitterQuote;
            }
            else {
                // If we're using the discord quote, we need to remove any italics.
                // Italics are marked for discord by surrounding text with *'s. This strips those *'s for twitter.
                // We'll need to do something more sophisticated here if the source text starts including 
                // *'s, but for now this gets the job done.
                twitterQuote = quoteObject.quote.replace(/[*]/g, '');

            }
            
            // Check the tweet lenght
            // A tweet is made up of the quote, two newlines, and the title
            let tweetLength = twitterQuote.length + 2 + bookItem.title.length;
            if (tweetLength > 280) {
                console.log("++++++\nQuote Too Long!\n" +
                    tweetLength + " characters!\n" +
                    twitterQuote + "\n\n" +
                    bookItem.title + "\n++++++");
            }

            twitterResult[book + "quotes"].push(twitterQuote);
        });
    }
});

let createStream = fs.createWriteStream("result.json");
createStream.write(JSON.stringify(twitterResult));
createStream.end();