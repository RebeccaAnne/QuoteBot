const path = require('node:path');
const tracery = require('tracery-grammar');
const { EmbedBuilder } = require('discord.js');


module.exports = {
    generateQuote: (guildId, channelId) => {

        console.log("Generating quote!");
        console.log("guildId: " + guildId + " channelId: " + channelId);
        try {
            let serverConfig = require(path.join(__dirname, "data/server-config-" + guildId + ".json"));
            let channel = serverConfig.channels[channelId];

            if (channel) {
                console.log("channel.tracerySource: " + channel.tracerySource);
                let source = require(path.join(__dirname, "data/" + channel.tracerySource));

                console.log("channel.traceryRoot: " + channel.traceryRoot);
                let book = tracery.createGrammar(source).flatten('#' + channel.traceryRoot + '#');

                console.log("Book: " + book);

                let quoteArray = source[source[book].quotes]; 

                let quote = quoteArray[Math.floor(Math.random()*quoteArray.length)].quote;
                console.log("Quote:" + quote);

                return new EmbedBuilder()
                    .setDescription(quote + "\n")
                    .setFooter({ text: source[book].title })
                    .setColor(source[book].color);
            }
        }
        catch (error) {
            console.log("\n+++\ngenerateQuote failed\n" + error + "\n+++\n");
            return null;
        }
    }
}