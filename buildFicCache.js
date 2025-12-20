const puppeteer = require("puppeteer");
const path = require('node:path');
const fs = require('node:fs');
const { getOptInAo3Names, isFicOptedIn } = require('./ficLinkGenerator.js');
const { ao3Password } = require('./config.json');

let fandomName = "Nine Worlds Series - Victoria Goddard"
//let fandomName = "Tuyo Series- Rachel Neumeier"
let append = true;

// If this is set we'll start here (working backwards). 
// Otherwise we'll start at the largest page number in the fandom tag.
let startingPage = 1;

if (process.argv[2])
    fandomName = process.argv[2]

buildFicCache = async () => {

    // Get the list of ao3 names that are opted in to sharing archive locked fics
    let ao3OptIns = getOptInAo3Names();

    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
    });

    let rootFandomPage = "https://archiveofourown.org/tags/" + fandomName + "/works";

    // Open a new page
    const page = await browser.newPage();

    // This lie apparently convinces ao3 that i'm not a bot and they should let me load the page
    const ua =
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.3";
    await page.setUserAgent(ua);

    // If we didn't configure a starting page, figure out what the largest page number is
    if (!startingPage) {
        // Open the link and wait until the dom content is loaded (HTML is ready)
        console.log("Goto the main fandom page")
        await page.goto(rootFandomPage, {
            waitUntil: "domcontentloaded",
        });

        // Log in to ao3 in order to access archive locked fic.
        await page.click('#login-dropdown');
        await page.type('#user_session_login_small', 'ClockworkEcho');
        await page.type('#user_session_password_small', ao3Password);
        await page.click('input[type="submit"]');
        console.log("Waiting 10 seconds");
        await new Promise(resolve => setTimeout(resolve, 10000));

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

            // Remove commas from numbers over 1000
            countString = countString.replace(",", "");

            let returnObject = {
                logstring: logstring,
                ficCount: Number(countString)
            }

            return returnObject;
        });
        console.log(ficCountInfo.logstring)
        // There are 20 fics per page
        let pageCount = Math.ceil(ficCountInfo.ficCount / 20);

        console.log("ficCount " + ficCountInfo.ficCount + ", pageCount " + pageCount);

        startingPage = pageCount;
    }
    console.log("startingPage " + startingPage);

    let ficCache = [];
    let lockedFicObject = {};
    lockedFicObject.lockedFicCache = []
    lockedFicObject.lockedAuthors = []
    lockedFicObject.optedInFics = []
    lockedFicObject.optedInAuthors = []

    if (append) {
        try {
            ficCache = require(".\\" + fandomName + ".json");
        }
        catch { console.log("Failed to load fic cache from file"); }

        try {
            lockedFicObject = require(".\\" + fandomName + "-locked.json");
        }
        catch { console.log("Failed to load locked fic cache from file"); }
    }

    if (append) {
        console.log(ficCache)
        console.log("Current cache loaded")
    }

    // Store this in a set to de-dup
    const lockedAuthors = new Set(lockedFicObject.lockedAuthors);
    const optedInAuthors = new Set(lockedFicObject.optedInAuthors);

    for (let iPage = startingPage; iPage >= 1; iPage--) {

        // Close the browser so ao3 doesn't get mad at us for being a bot
        await browser.close();

        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
        });
        const page = await browser.newPage();
        await page.setUserAgent(ua);

        console.log("Caching page " + iPage);

        // Append the page to the fandom link
        let fandomPage = rootFandomPage + "?page=" + iPage;
        //fandomPage = "https://archiveofourown.org/works?commit=Sort+and+Filter&work_search[sort_column]=created_at&tag_id=Tuyo+Series-+Rachel+Neumeier&page=" + iPage;
        fandomPage = "https://archiveofourown.org/works?commit=Sort+and+Filter&work_search[sort_column]=created_at&tag_id=Nine+Worlds+Series+-+Victoria+Goddard&page=" + iPage;
        console.log("Goto page " + fandomPage);

        await page.goto(fandomPage, {
            waitUntil: "domcontentloaded",
        });

        console.log("Evaluating")

        // Log in to ao3 in order to access archive locked fic.
        await page.click('#login-dropdown');
        await page.type('#user_session_login_small', 'ClockworkEcho');
        await page.type('#user_session_password_small', ao3Password);
        await page.click('input[type="submit"]');

        // Wait 30 seconds to avoid rate limitting
        console.log("Waiting 30 seconds");
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Get the info for the fics on this page
        let pageEvaluateResult = await page.evaluate(() => {
            let logstring = "";
            let ficArray = [];
            let ficList = document.querySelector("#main > ol.work.index.group")

            // Most pages have 20 fics, but the last page may have fewer
            let ficsOnPage = ficList.children.length;

            for (let iFic = ficsOnPage - 1; iFic >= 0; iFic--) {

                // Get the fic
                let fic = ficList.children.item(iFic);


                // Get the data for the fic, starting with the header
                let header = fic.querySelector("div > h4");

                // item(0) is the linked fic title
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

                // Locked fics will have a little lock image in the header on ao3.
                // Look for that image, and if it's there, set locked to true.
                let ficIsLocked = header.querySelector("img");
                if(ficIsLocked)
                {
                    // Add a lock icon to our title as well
                    title = ":lock: " + title;
                }

                // Get the summary. If this element is missing use a blank string
                let summary = " "
                let summaryElement = fic.querySelector("blockquote");
                if (summaryElement) {
                    summary = summaryElement.innerText;
                }

                // Get the date
                let date = fic.querySelector("div > p").innerText;

                let ficObject = {
                    title: title,
                    author: author,
                    summary: summary,
                    link: link,
                    date: date,
                    locked: !!ficIsLocked,
                }
                ficArray.push(ficObject)
            }
            let returnObject = {
                logstring: logstring,
                ficArray: ficArray
            }

            return returnObject;
        })
        console.log(pageEvaluateResult.logstring)
        console.log(pageEvaluateResult.ficArray)

        // Sort the locked fics from the unlocked fics. Locked fics can go in the main cache if the
        // author is opted in.
        for (let fic of pageEvaluateResult.ficArray) {
            if (fic.locked && !isFicOptedIn(fic.author, ao3OptIns)) {
                console.log(fic.author + " is not opted in");
                lockedAuthors.add(fic.author.trim())
                lockedFicObject.lockedFicCache.push(fic);
            }
            else {
                if(fic.locked)
                {
                    optedInAuthors.add(fic.author.trim())
                    lockedFicObject.optedInFics.push(fic)
                }
                ficCache.push(fic);
            }
        }

        lockedFicObject.lockedAuthors = Array.from(lockedAuthors);
        lockedFicObject.optedInAuthors = Array.from(optedInAuthors);

        console.log("Cached page " + iPage + ", Current results:");
        console.log(ficCache.length + " fics Cached")
        console.log(lockedFicObject.lockedFicCache.length + " locked fics")
        console.log(lockedFicObject.lockedAuthors.length + " locked authors")
        console.log(lockedFicObject.optedInFics.length + " opted in fics")
        console.log(lockedFicObject.optedInAuthors.length + " opted in authors")
        //console.log(lockedFicObject.lockedAuthors)
        fs.writeFileSync(fandomName + ".json", JSON.stringify(ficCache), () => { });
        fs.writeFileSync(fandomName + "-locked.json", JSON.stringify(lockedFicObject), () => { });
    }
    // Close the browser
    await browser.close();

    fs.writeFileSync(fandomName + ".json", JSON.stringify(ficCache), () => { });

    console.log("Success! " + ficCache.length + " total fics Cached")
}

buildFicCache();