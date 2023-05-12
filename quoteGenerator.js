const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const { randomIndexSelection } = require('./randomSelection.js');
const { logString } = require('./logging');

module.exports = {
    generateQuote: (guildId, channelId) => {

        logString("Generating quote!");
        logString("guildId: " + guildId + " channelId: " + channelId);
        try {
            let serverConfig = require(path.join(__dirname, "data/server-config-" + guildId + ".json"));
            let channel = serverConfig.channels[channelId];

            if (channel) {
                logString("channel.rootSourceFile: " + channel.rootSourceFile);
                let rootSourceFile = require(path.join(__dirname, "data/" + channel.rootSourceFile));
                logString("channel.quoteRoot: " + channel.quoteRoot);

                let quoteRoot = rootSourceFile[channel.quoteRoot];
                let book = quoteRoot[Math.floor(Math.random() * quoteRoot.length)];

                logString("Book: " + book);

                let bookConfig = rootSourceFile[book];
                let bookQuoteFile = require(path.join(__dirname, "data/" + bookConfig.quoteSourceFile));

                let quoteArray = bookQuoteFile[book + "quotes"];
                let quoteIndex = randomIndexSelection(guildId, book, quoteArray.length, true);

                let quoteObject = quoteArray[quoteIndex];
                let quote = quoteObject.quote;
                logString("Quote:" + quote);

                let description = quote + "\n";
                let color = rootSourceFile[book].color;

                // Build the footer. Format is:
                //
                // Title of the Book
                // Chapter 4; 65%
                //
                // Chapter and percentage may or may not be present
                let footerText = rootSourceFile[book].title;

                if ((quoteObject.chapter != null) || (quoteObject.percentage != null)) {
                    footerText += "\n";

                    if (quoteObject.chapter != null) {
                        footerText += quoteObject.chapter;
                        if (quoteObject.percentage != null) {
                            footerText += ",  ";
                        }
                    }

                    if (quoteObject.percentage != null) {
                        footerText += quoteObject.percentage + "%";
                    }
                }

                return new EmbedBuilder()
                    .setDescription(description)
                    .setFooter({ text: footerText })
                    .setColor(color);
            }
        }
        catch (error) {
            logString("\n+++\ngenerateQuote failed\n" + error + "\n+++\n");
            return null;
        }
    }
}