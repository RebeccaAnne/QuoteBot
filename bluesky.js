const { BskyAgent } = require("@atproto/api");
const path = require('node:path');
const { randomIndexSelection } = require('./randomSelection.js');

async function sendQuotePost() {
    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({
        identifier: process.env.BSKY_HANDLE, //"victoriagoddardbot.bsky.social",
        password: process.env.BSKY_PASSWORD, //"idLqvJ_LW5G8U!q",
    });

    let quote = null;
    let book = null;
    let quoteObject

    let rootSourceFile = require(path.join(__dirname, "data/" + "victoriaGoddard.json"));
    let quoteRoot = rootSourceFile["all"];
    while (quote == null) {
        book = quoteRoot[randomIndexSelection("bluesky", "all", quoteRoot.length)];

        console.log("Book: " + book);

        let bookConfig = rootSourceFile[book];
        let bookQuoteFile = require(path.join(__dirname, "data/" + bookConfig.quoteSourceFile));

        let quoteArray = bookQuoteFile[book + "quotes"];
        let quoteIndex = randomIndexSelection("bluesky", book, quoteArray.length, true);

        quoteObject = quoteArray[quoteIndex];
        quote = quoteObject.quote;
        console.log("Quote:" + quote);
        if (quote.length > 300) {
            console.log("Quote too long! " + quote.length + " characters.")
            quote = null;
        }
    }
    let post = await agent.post({ text: quote });
    console.log(post);

    // Reply with book info. Format is:
    //
    // Title of the Book
    // Chapter 4; 65%
    //
    // Chapter and percentage may or may not be present
    let replyText = rootSourceFile[book].title;

    if ((quoteObject.chapter != null) || (quoteObject.percentage != null)) {
        replyText += "\n";

        if (quoteObject.chapter != null) {
            replyText += quoteObject.chapter;
            if (quoteObject.percentage != null) {
                replyText += ", ";
            }
        }

        if (quoteObject.percentage != null) {
            replyText += quoteObject.percentage + "%";
        }
    }

    let reply = await agent.post({
        text: replyText,
        reply: {
            root: {
                uri: post.uri,
                cid: post.cid,
            },
            parent: {
                uri: post.uri,
                cid: post.cid,
            }
        }
    });
    console.log(reply);

    return;
}



sendQuotePost();
