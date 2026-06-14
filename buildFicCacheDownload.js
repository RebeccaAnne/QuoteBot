const puppeteer = require("puppeteer");
const path = require('node:path');
const fs = require('node:fs');
const { getOptInAo3Names, isFicOptedIn } = require('./ficLinkGenerator.js');
const { ao3Password } = require('./config.json');

let fandomName = "Nine Worlds Series - Victoria Goddard"
//let fandomName = "Tuyo Series- Rachel Neumeier"
let append = false;

// If this is set we'll start here (working backwards). 
// Otherwise we'll start at the largest page number in the fandom tag.
let startingPage = 73;

if (process.argv[2])
    fandomName = process.argv[2]

getFicId = (ficLink) => {
    const ao3Link = "https://archiveofourown.org/works/"
    return ficLink.slice(ao3Link.length);
}

buildFicCache = async () => {

    // Get the list of ao3 names that are opted in to sharing archive locked fics
    let ao3OptIns = getOptInAo3Names();

    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
    });

    let rootFandomPage = "http://archiveofourown.org/tags/" + fandomName + "/works";

    // Open a new page
    const page = await browser.newPage();

    // This lie apparently convinces ao3 that i'm not a bot and they should let me load the page
    const ua =
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.3";
    //await page.setUserAgent(ua);

    let ficCache = {};
    let lockedFicObject = {};
    lockedFicObject.lockedFicCache = []
    lockedFicObject.lockedAuthors = []
    lockedFicObject.optedInFics = []
    lockedFicObject.optedInAuthors = []

    if (append) {
        try {
            ficCache = require(".\\" + fandomName + " - Ids.json");
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
    let cachedFicCount = 0;

    for (let iPage = startingPage; iPage >= 1; iPage--) {

        console.log("Caching page " + iPage);

        // Append the page to the fandom link
        let fandomPage = rootFandomPage + "?page=" + iPage;
        //fandomPage = "http://archiveofourown.org/works?commit=Sort+and+Filter&work_search[sort_column]=created_at&tag_id=Tuyo+Series-+Rachel+Neumeier&page=" + iPage;
        fandomPage = "file:///C:/Users/rebec/OneDrive/Desktop/Nine%20Worlds/Nine%20Worlds%20Series%20-%20Victoria%20Goddard%20-%20Works%20_%20Archive%20of%20Our%20Own%20-%20" + iPage + ".html"
        console.log("Goto page " + fandomPage);

        await page.goto(fandomPage, {
            waitUntil: "domcontentloaded",
        });

        console.log("Evaluating")

        // Log in to ao3 in order to access archive locked fic.
        // await page.click('#login-dropdown');
        // await page.type('#user_session_login_small', 'ClockworkEcho');
        // await page.type('#user_session_password_small', ao3Password);
        // await page.click('input[type="submit"]');

        // // Wait 30 seconds to avoid rate limitting
        // console.log("Waiting 30 seconds");
        // await new Promise(resolve => setTimeout(resolve, 30000));
        // console.log("Done waiting");

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
                ficCache[getFicId(fic.link)] = fic;
                cachedFicCount++;            }
        }

        lockedFicObject.lockedAuthors = Array.from(lockedAuthors);
        lockedFicObject.optedInAuthors = Array.from(optedInAuthors);

        console.log("Cached page " + iPage + ", Current results:");
        console.log(cachedFicCount + " fics Cached")
        ficCache.ficCount = cachedFicCount;
        console.log(lockedFicObject.lockedFicCache.length + " locked fics")
        console.log(lockedFicObject.lockedAuthors.length + " locked authors")
        console.log(lockedFicObject.optedInFics.length + " opted in fics")
        console.log(lockedFicObject.optedInAuthors.length + " opted in authors")
        //console.log(lockedFicObject.lockedAuthors)
        fs.writeFileSync(fandomName + ".json - Ids", JSON.stringify(ficCache), () => { });
        fs.writeFileSync(fandomName + "-locked.json", JSON.stringify(lockedFicObject), () => { });
    }
    // Close the browser
    await browser.close();

    fs.writeFileSync(fandomName + " - Ids.json", JSON.stringify(ficCache), () => { });

    console.log("Success! " + cachedFicCount + " total fics Cached")
}

buildFicCache();