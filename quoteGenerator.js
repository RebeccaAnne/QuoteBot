const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const { randomIndexSelection } = require('./randomSelection.js');
const { logString } = require('./logging');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    generateQuote: (guildId, channelId) => {

        logString("Generating quote!");
        logString("guildId: " + guildId + " channelId: " + channelId);
        //        try {
        let serverConfig = require(path.join(__dirname, "data/server-config-" + guildId + ".json"));
        let channel = serverConfig.channels[channelId];

        if (channel) {
            logString("channel.rootSourceFile: " + channel.rootSourceFile);
            let rootSourceFile = require(path.join(__dirname, "data/" + channel.rootSourceFile));
            logString("channel.quoteRoot: " + channel.quoteRoot);

            let quoteRoot = rootSourceFile[channel.quoteRoot];
            let book = quoteRoot[randomIndexSelection(guildId, channel.quoteRoot, quoteRoot.length)];

            logString("Book: " + book);

            let bookConfig = rootSourceFile[book];
            let bookQuoteFile = require(path.join(__dirname, "data/" + bookConfig.quoteSourceFile));

            let quoteArray = bookQuoteFile[book + "quotes"];
            let quoteIndex = randomIndexSelection(guildId, book, quoteArray.length, true);

            let quoteObject = quoteArray[quoteIndex];
            let quote = quoteObject.quote;
            logString("Quote:" + quote);

            let description = ""

            let addSpoilers = rootSourceFile[book].courtesySpoilers &&
                rootSourceFile[book].courtesySpoilers.includes(guildId);

            if (addSpoilers) {
                description += "||"
            }

            description += quote;
            if (addSpoilers) {
                description += "||"
            }
            description += "\n";

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
                        footerText += ", ";
                    }
                }

                if (quoteObject.percentage != null) {
                    footerText += quoteObject.percentage + "%";
                }
            }

            const coverPath = "./data/Images/" + book + ".png";
            if (fs.existsSync(coverPath)) {

                const cover = new AttachmentBuilder(coverPath);
                let embed = new EmbedBuilder()
                    .setDescription(description)
                    .setFooter({ text: footerText, iconURL: "attachment://" + book + ".png" })
                    .setColor(color)

                return { embeds: [embed], files: [cover] };
            }
            else {
                let embed = new EmbedBuilder()
                    .setDescription(description)
                    .setFooter({ text: footerText })
                    .setColor(color)

                return { embeds: [embed] };
            }
        }
        // }
        // catch (error) {
        //     logString("\n+++\ngenerateQuote failed\n" + error + "\n+++\n");
        //     return null;
        // }
    }
}