const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    generateQuote: (guildId, channelId) => {

        console.log("Generating quote!");
        console.log("guildId: " + guildId + " channelId: " + channelId);
        try {
            let serverConfig = require(path.join(__dirname, "data/server-config-" + guildId + ".json"));
            let channel = serverConfig.channels[channelId];

            if (channel) {
                console.log("channel.quoteSourceFile: " + channel.quoteSourceFile);
                let source = require(path.join(__dirname, "data/" + channel.quoteSourceFile));
                console.log("channel.quoteRoot: " + channel.quoteRoot);

                let quoteRoot = source[channel.quoteRoot];
                let book = quoteRoot[Math.floor(Math.random() * quoteRoot.length)];

                console.log("Book: " + book);

                let quoteArray = source[source[book].quotes];

                let quoteObject = quoteArray[Math.floor(Math.random() * quoteArray.length)];
                let quote = quoteObject.quote;
                console.log("Quote:" + quote);

                let description = quote + "\n";
                let color = source[book].color;

                // Build the footer. Format is:
                //
                // Title of the Book
                // Chapter 4; 65%
                //
                // Chapter and percentage may or may not be present
                let footerText = source[book].title;

                if ((quoteObject.chapter != null) || (quoteObject.percentage != null)) {
                    footerText += "\n";

                    if (quoteObject.chapter != null) {
                        footerText += quoteObject.chapter;
                        if (quoteObject.percentage != null) {
                            footerText += ";  ";
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
            console.log("\n+++\ngenerateQuote failed\n" + error + "\n+++\n");
            return null;
        }
    }
}