const path = require('node:path');
const AO3 = require('ao3');
const { EmbedBuilder } = require('discord.js');
const { accessSync } = require('node:fs');
const { randomSelection } = require('./randomSelection.js');

module.exports = {
    generateFicLink: async (guildId, channelId) => {

        console.log("Finding a Fic!");
        try {

            // Get the fandom tag from the server config
            let serverConfig = require(path.join(__dirname, "./data/server-config-" + guildId + ".json"));

            let channel = serverConfig.channels[channelId];
            if (channel) {
                let fandom = channel.ficFandomTag;
                if (fandom) {
                    console.log("Fandom: " + fandom);

                    // Do a search against the fandom tag to see how many pages of fics there are
                    let search = new AO3.Search(undefined, undefined, undefined, undefined, undefined, undefined,
                        fandom);

                    await search.update();

                    console.log("Total results: " + search.total_results);
                    console.log("Total pages: " + search.pages);

                    // Reverse the index returned from randomSelection, because new fics will be added at the beginning (index 0)
                    let ficIndex = (search.total_results - randomSelection(guildId, "fic", search.total_results));

                    // Figure out what page that fic is on (1 indexed)
                    let ficPage = Math.floor(ficIndex / 20) + 1;
                    console.log("Page: " + ficPage);

                    // Do another search to get the fics on that page
                    let pageSearch = new AO3.Search(undefined, undefined, undefined, undefined, undefined, undefined,
                        fandom, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
                        ficPage);

                    await pageSearch.update();

                    let indexOnPage = ficIndex - (ficPage - 1) * 20;
                    let randomWork = pageSearch.results[indexOnPage];
                    console.log(randomWork.title);

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
            console.log("\n+++\ngenerateFicLink failed\n" + error + "\n+++\n");
            return null;
        }
    }
}