const path = require('node:path');
const AO3 = require('ao3');
const fs = require("fs");
const { EmbedBuilder } = require('discord.js');
const { randomIndexSelection } = require('./randomSelection.js');
const { logString } = require('./logging');
const puppeteer = require("puppeteer");


// This function is a remnant of the old implementation for fics, where i maintained a cache and 
// prevented dups and all those good things. It was based on the ao3 library that stopped working.
// Now i scrape things myself(!) but it just does a dumb random fic and doesn't do anything clever.
// Leaving this here for now for reference if i want at some point to come back and rebuild this
// functionality.
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

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
    });

    // Get the fandom from the server config
    let serverConfig = require(path.join(__dirname, "./data/server-config-" + guildId + ".json"));
    let channel = serverConfig.channels[channelId];
    let fandomPage = "https://archiveofourown.org/tags/" + channel.ficFandomTag + "/works";

    // Open a new page
    const page = await browser.newPage();

    // This lie apparently convinces ao3 that i'm not a bot and they should let me load the page
    const ua =
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.3";
    await page.setUserAgent(ua);

    // Open the link and wait until the dom content is loaded (HTML is ready)
    console.log("Goto the main fandom page")
    await page.goto(fandomPage, {
        waitUntil: "domcontentloaded",
    });

    // Figure out how many fics are in this fandom
    const ficCountInfo = await page.evaluate(() => {
        let logstring = "Evaluating fandom Page"

        // Get the header string, which looks like this:
        // 1 - 20 of 887 Works in Nine Worlds Series - Victoria Goddard
        let countString = document.querySelector("#main > h2").innerText.trim();
        logstring += "\ncountString: " + countString;

        // Remove everything before the " of "
        countString = countString.slice(countString.indexOf(" of ") + 4);

        // Find the next space and cut it off so we have just the fic count
        countString = countString.slice(0, countString.indexOf(" "))

        let returnObject = {
            logstring: logstring,
            ficCount: Number(countString)
        }

        return returnObject;
    });
    console.log(ficCountInfo.logstring)

    // There are 20 fics per page
    let pageCount = Math.ceil(ficCountInfo.ficCount / 20);

    // Choose a random page from 1 to pagecount
    let randomPage = Math.ceil(Math.random() * pageCount);

    console.log("ficCount " + ficCountInfo.ficCount + ", pageCount " + pageCount + ", randomPage " + randomPage);

    // Append the randomly selected page to the fandom link
    fandomPage += "?page=" + randomPage;
    console.log("Goto page " + fandomPage);

    await page.goto(fandomPage, {
        waitUntil: "domcontentloaded",
    });

    // Get the info for a random fic from this page
    const fic = await page.evaluate(() => {
        let ficList = document.querySelector("#main > ol.work.index.group")

        // Most pages have 20 fics, but the last page may have fewer
        let ficsOnPage = ficList.children.length;
        let randomFicIndex = Math.floor(Math.random() * ficsOnPage);

        // Get the randomly selected fic
        let fic = ficList.children.item(randomFicIndex);

        // Get the data for the fic, starting with the title and link in the header
        let header = fic.querySelector("div > h4");
        let title = header.children.item(0).innerText;
        let link = header.children.item(0).href;

        // The full header text is:
        // <title> by <list of authors> [for <gift recipient>]
        // We want to get the <list of authors> part
        let author = header.innerText;

        // Slice off the length of the title plus 4 characters for " by "
        author = author.slice(title.length + 4)

        // If there's a " for " at the end, slice that off too
        let giftRecipientIndex = author.lastIndexOf(" for ");
        if (giftRecipientIndex != -1) {
            author = author.slice(0, author.lastIndexOf(" for "));
        }

        // Get the summary and date
        let summary = fic.querySelector("blockquote").innerText;
        let date = fic.querySelector("div > p").innerText;

        let returnObject = {
            ficsOnPage: ficsOnPage,
            randomFic: randomFicIndex,
            header: header.innerText,
            title: title,
            author: author,
            summary: summary,
            link: link,
            date: date
        }
        return returnObject;
    })
    console.log(fic)

    // Close the browser
    await browser.close();

    // We've got a fic, let's build an embed for it.
    let embed = new EmbedBuilder()
        .setTitle(fic.title)
        .setDescription(fic.summary)
        .setAuthor({ name: fic.author })
        .setURL(fic.link)
        .setFooter({ text: fic.date })
        .setColor(0x666666);

    return { embeds: [embed] };
}

module.exports = {
    generateFicLink
}