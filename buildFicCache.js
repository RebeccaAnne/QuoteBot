const puppeteer = require("puppeteer");
const path = require('node:path');
const fs = require('node:fs');

let fandomName = "Nine Worlds Series - Victoria Goddard"
//let fandomName = "Tuyo Series- Rachel Neumeier"
let append = false;

// If this is set we'll start here (working backwards). 
// Otherwise we'll start at the largest page number in the fandom tag.
let startingPage = undefined//42;

if (process.argv[2])
    fandomName = process.argv[2]

getOptInAo3Names = () => {

    let optIns = {};
    try {
        optIns = require(".\\opt-in.json");
    }
    catch { console.log("Failed to load opt-ins from file"); }

    let optedInAo3NameArray = []
    for (let discordUser in optIns) {
        for (let ao3Name in optIns[discordUser].ao3UserNames) {
            //console.log(optIns[discordUser].ao3UserNames[ao3Name])
            if (optIns[discordUser].ao3UserNames[ao3Name].optIn &&
                optIns[discordUser].ao3UserNames[ao3Name].approval === "Approved") {
                //console.log("Add " + ao3Name + "!")
                optedInAo3NameArray.push(ao3Name)
            }
        }
    }
    return optedInAo3NameArray;
}

buildFicCache = async () => {

    // Get the list of ao3 names that are opted in to sharing archive locked fics
    let ao3OptIns = getOptInAo3Names();
    console.log(ao3OptIns);

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
        // await page.click('#login-dropdown');
        // await page.type('#user_session_login_small', 'AluraRose');
        // await page.type('#user_session_password_small', '4!MU6H2xVRYmafg');
        // await page.click('input[type="submit"]');
        // console.log("Waiting 10 seconds");
        // await new Promise(resolve => setTimeout(resolve, 10000));

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

    if (append) {
        try {
            ficCache = require(".\\" + fandomName + ".json");
        }
        catch { console.log("Failed to load fic cache from file"); }
    }

    if (append) {
        console.log(ficCache)
        console.log("Current cache loaded")
    }

    for (let iPage = startingPage; iPage >= 1; iPage--) {

        // Close the browser and wait 10 seconds so ao3 doesn't get mad at us for being a bot
        await browser.close();
        console.log("Waiting 10 seconds");
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log("Done Waiting")

        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
        });
        const page = await browser.newPage();
        await page.setUserAgent(ua);

        console.log("Caching page " + iPage);

        // page 17
        // Append the page to the fandom link
        let fandomPage = rootFandomPage + "?page=" + iPage;
        //fandomPage = "https://archiveofourown.org/works?commit=Sort+and+Filter&work_search[sort_column]=created_at&tag_id=Tuyo+Series-+Rachel+Neumeier&page=" + iPage;
        fandomPage = "https://archiveofourown.org/works?commit=Sort+and+Filter&work_search[sort_column]=created_at&tag_id=Nine+Worlds+Series+-+Victoria+Goddard&page=" + iPage;
        console.log("Goto page " + fandomPage);

        await page.goto(fandomPage, {
            waitUntil: "domcontentloaded",
        });

        console.log("Evaluating")

        // Get the info for the fics on this page
        let pageEvaluateResult = await page.evaluate((ao3OptIns) => {
            logstring = "";
            let ficArray = [];
            let ficList = document.querySelector("#main > ol.work.index.group")

            // Most pages have 20 fics, but the last page may have fewer
            let ficsOnPage = ficList.children.length;

            for (let iFic = ficsOnPage - 1; iFic >= 0; iFic--) {

                // Get the fic
                let fic = ficList.children.item(iFic);

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

                let ficIsLocked = true;

                let optedInAuthor = null;
                if (ficIsLocked) {
                    optedInAuthor = ao3OptIns.find((optedInName) => {
                        // Split multiple authors into an array of authors
                        let authorArray = author.split(",");

                        // look for this optedInName in the array of authors
                        return authorArray.find((splitAuthor) => {
                            splitAuthor = splitAuthor.trim();

                            // If the author is of the form name1 (name2) this represents multiple ao3 psueds.
                            // Consider this author opted-in if either name matches an opted-in username
                            let paren1Index = splitAuthor.indexOf("(")
                            let paren2Index = splitAuthor.indexOf(")")
                            if (paren1Index != -1) {
                                name1 = splitAuthor.slice(0, paren1Index).trim();
                                name2 = splitAuthor.slice(paren1Index + 1, paren2Index).trim();
                                return optedInName.toLowerCase() == name1.toLowerCase() ||
                                    optedInName.toLowerCase() == name2.toLowerCase();
                            }
                            else {
                                return optedInName.toLowerCase() == splitAuthor.toLowerCase();
                            }
                        })
                    })
                    //logstring += ("\nFound optedinAuthor: " + optedInAuthor);
                }
                if (!optedInAuthor) {
                    logstring += "\n" + author + " is not opted in"
                    continue;
                }
                else {
                    logstring += "\n" + author + " is opted in"
                }

                // Get the summary. If this element is missing use a blank string
                let summary = ""
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
                    date: date
                }
                ficArray.push(ficObject)
            }
            let returnObject = {
                logstring: logstring,
                ficArray: ficArray
            }

            return returnObject;
        }, ao3OptIns)
        console.log(pageEvaluateResult.logstring)
        console.log(pageEvaluateResult.ficArray)

        ficCache = ficCache.concat(pageEvaluateResult.ficArray);

        console.log("Cached page " + iPage);
        console.log(ficCache.length + " fics Cached so far")
        fs.writeFileSync(fandomName + ".json", JSON.stringify(ficCache), () => { });
    }
    // Close the browser
    await browser.close();

    fs.writeFileSync(fandomName + ".json", JSON.stringify(ficCache), () => { });

    console.log("Success! " + ficCache.length + " total fics Cached")
}

buildFicCache();