const path = require('node:path');
const AO3 = require('ao3');
const dayjs = require('dayjs');
const fs = require("fs");
const { EmbedBuilder } = require('discord.js');
const { accessSync } = require('node:fs');
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

            // Do a search against the fandom tag to see how many pages of fics there are
            let search = new AO3.Search(undefined, undefined, undefined, undefined, undefined, undefined,
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

                    // THE BUG IS THAT WE'RE GOING IN REVERSE ORDER!!

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
                }

                // Write the update cache to the file
                fs.writeFileSync(serverArrayFileName, JSON.stringify(serverArrays), () => { });

                if (totalPages > serverArrays.ficPagesCached) {
                    // If we still haven't cached all the fic, schedule a call to do some more in 1 minute
                    // (A long time, so we don't get rate limited *or* create contension with 
                    // a fic currently being requested)
                }
            }
        }
    }
}

generateFicLink = async (guildId, channelId) => {

    logString("Finding a Fic!");
    try {

        await updateFicCache(guildId, channelId)

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

                return { embeds: [embed] };
            }
        }
    }

    catch (error) {
        logString("\n+++\ngenerateFicLink failed\n" + error + "\n+++\n");
        return null;
    }
}

module.exports = {
    updateFicCache, generateFicLink
}