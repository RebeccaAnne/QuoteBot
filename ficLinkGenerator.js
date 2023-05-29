const path = require('node:path');
const AO3 = require('ao3');
const { EmbedBuilder } = require('discord.js');
const { accessSync } = require('node:fs');
const { randomIndexSelection } = require('./randomSelection.js');
const { logString } = require('./logging');

module.exports = {
    generateFicLink: async (guildId, channelId) => {

        logString("Finding a Fic!");
        try {

            // Get the fandom tag from the server config
            let serverConfig = require(path.join(__dirname, "./data/server-config-" + guildId + ".json"));

            let channel = serverConfig.channels[channelId];
            if (channel) {
                let fandom = channel.ficFandomTag;
                if (fandom) {
                    logString("Fandom: " + fandom);

                    // Do a search against the fandom tag to see how many pages of fics there are
                    let search = new AO3.Search(undefined, undefined, undefined, undefined, undefined, undefined,
                        fandom);

                    await search.update();

                    logString("Total results: " + search.total_results);
                    logString("Total pages: " + search.pages);

                    // Reverse the index returned from randomIndexSelection, because new fics will be added at the beginning (index 0)
                    let ficIndex = (search.total_results - 1 - randomIndexSelection(guildId, "fic", search.total_results));

                    // Figure out what page that fic is on (1 indexed)
                    let ficPage = Math.floor(ficIndex / 20) + 1;
                    logString("Page: " + ficPage);

                    // Do another search to get the fics on that page. Sort by "created_at" so that 
                    // the indexes don't change when a new chapter is posted to an existing fic.
                    let pageSearch = new AO3.Search(undefined, undefined, undefined, undefined, undefined, undefined,
                        fandom, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
                        ficPage, "created_at");

                    await pageSearch.update();

                    let indexOnPage = ficIndex - (ficPage - 1) * 20;
                    let randomWork = pageSearch.results[indexOnPage];
                    logString(randomWork.title);

                    let authors = "";
                    for (author of randomWork.authors) {
                        if (authors) {
                            authors += ", "
                        }
                        authors += author.username;
                    }

                    // We've got a fic, let's build an embed for it.
                    let embed = new EmbedBuilder()
                        .setTitle(randomWork.title)
                        .setDescription(randomWork.summary)
                        .setAuthor({ name: authors })
                        .setURL(randomWork.url)
                        .setFooter({ text: randomWork.updated.toDateString() })
                        .setColor(0x666666);

                    return embed;
                }
            }
        }

        catch (error) {
            logString("\n+++\ngenerateFicLink failed\n" + error + "\n+++\n");
            return null;
        }
    }
}