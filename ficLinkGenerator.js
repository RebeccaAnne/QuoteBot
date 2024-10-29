const path = require('node:path');
const AO3 = require('ao3');
const fs = require("fs");
const { EmbedBuilder } = require('discord.js');
const { randomIndexSelection } = require('./randomSelection.js');
const { logString } = require('./logging');

updateFicCache = async (guildId, channelId) => {

    logString("Building the fic cache")

    let serverArrayFileName = "./arrays-" + guildId + ".json";

    let serverArrays = {};
    try {
        serverArrays = require(serverArrayFileName);
    }
    catch { logString("Failed to load serverArrays from file"); }

    let serverConfig = require(path.join(__dirname, "./data/server-config-" + guildId + ".json"));
    let channel = serverConfig.channels[channelId];
    if (channel) {
        let fandom = channel.ficFandomTag;
        if (fandom) {
            logString("Fandom: " + fandom);
            let search;
            // Do a search against the fandom tag to see how many pages of fics there are
            search = new AO3.Search(undefined, undefined, undefined, undefined, undefined, undefined,
                fandom);

            await search.update();

            let totalPages = search.pages;

            logString("Total results: " + search.total_results);
            logString("Total pages: " + search.pages);

            let ficPagesCached = 0;
            if (serverArrays.ficPagesCached != undefined) {
                ficPagesCached = serverArrays.ficPagesCached;
            }

            let updateCache = false;
            let mostRecentCachedFic = 0;

            // If there are more pages than we have cached, cache some fic! Note that having 
            // all the pages may not mean we have all the fic, but we only update if we're at 
            // least a full page behind or we're out of fics.
            if (totalPages > ficPagesCached) {
                updateCache = true;
                if (serverArrays.mostRecentCachedFic != undefined) {
                    mostRecentCachedFic = serverArrays.mostRecentCachedFic;
                }

                logString("We have " + ficPagesCached + " out of " + totalPages + ". Caching more pages!")
            }
            else if (totalPages == ficPagesCached && serverArrays.ficIds.length == 0) {
                // We've cached all the pages, but the cache is empty (because we've used them all 
                // up). Reset the cache.
                updateCache = true;
                ficPagesCached = 0;

                logString("Fic array empty! Resetting cache!")
            }
            else {
                logString("Cache up to date!")
            }

            if (updateCache) {

                let pageToCache = totalPages - ficPagesCached;

                // Cache the last page we possibliy could have cached before again, to account for new 
                // fic possibly pushing things down. We'll check against the date to insure we don't add duplicates.
                if (ficPagesCached > 0) {
                    pageToCache++;
                }

                // We're going to cache two pages, the last one we might have already cached 
                // (which may have new fics) and one more (to make progress). If this is the 
                // first time it's running we'll cache the last two pages.
                for (i = 0; i < 2; i++) {

                    logString("Caching page " + pageToCache);
                    logString("Fics more recent than " + mostRecentCachedFic);

                    // Do another search to get the fics on that page. Sort by "created_at" so that 
                    // the order doesn't change when a new chapter is posted to an existing fic.
                    let pageSearch = new AO3.Search(undefined, undefined, undefined, undefined, undefined, undefined,
                        fandom, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
                        pageToCache, "created_at");

                    await pageSearch.update();

                    if (serverArrays.ficIds == undefined) {
                        serverArrays.ficIds = [];
                    }

                    let work;
                    let foundNewFics = false;

                    pageSearch.results.reverse();

                    for (work of pageSearch.results) {

                        // Skip all the fics until we find one more recent than the most recent 
                        // one we had on the last pass
                        if (!foundNewFics) {
                            if (work.id <= mostRecentCachedFic) {
                                logString("Fic " + work.id + " has already been cached! Skipping!")
                                continue;
                            }
                        }

                        foundNewFics = true;
                        logString("Adding fic " + work.id + " to the cache")
                        serverArrays.ficIds.push(work.id);
                        mostRecentCachedFic = work.id;
                    }
                    logString("Last fic cached  " + mostRecentCachedFic);
                    serverArrays.mostRecentCachedFic = mostRecentCachedFic;
                    serverArrays.ficPagesCached = totalPages - pageToCache + 1;
                    pageToCache--;

                    // shuffle the fics
                    serverArrays.ficIds.sort(() => Math.random() - 0.5);
                }

                // Write the updated cache to the file
                fs.writeFileSync(serverArrayFileName, JSON.stringify(serverArrays), () => { });
            }
        }
    }
}

generateFicLink = async (guildId, channelId) => {

    var d = require('domain').create()
    d.on('error', function (err) {
        // This is here to catch the http errors that get thrown out of other threads in the ao3 library.
        logString("Error generating fic link: \n" + err)
    })

    // catch the uncaught errors in this asynchronous or synchronous code block
    return d.run(async () => {

        logString("Finding a Fic!");
        await updateFicCache(guildId, channelId);

        let serverArrayFileName = "./arrays-" + guildId + ".json";
        let serverArrays = require(serverArrayFileName);

        logString("There are currently " + serverArrays.ficIds.length + " fics in the cache")

        let ficId = serverArrays.ficIds.pop();

        // All kinds of wonky things happen if use the fic as loaded by id. (author notes included in the summary, 
        // invalid dates) I don't know why. Doing a search for the title and getting the work from 
        // there gets better results. Yes this is extremely bogus.
        let randomWork = new AO3.Work(ficId);
        await randomWork.reload();

        let serverConfig = require(path.join(__dirname, "./data/server-config-" + guildId + ".json"));
        let channel = serverConfig.channels[channelId];

        let search = new AO3.Search(undefined, randomWork.title, undefined, undefined, undefined, undefined,
            channel.ficFandomTag);

        await search.update();

        // Find the work we're looking for by matching ids. (in case there's more than one 
        // fic with the same title) 
        for (let work of search.results) {
            if (ficId == work.id) {
                randomWork = work;
                break;
            }
        }

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

        // Write the array back to the file with the fic chosen removed
        fs.writeFileSync(serverArrayFileName, JSON.stringify(serverArrays), () => { });

        return { embeds: [embed] };
    });
}

module.exports = {
    updateFicCache, generateFicLink
}