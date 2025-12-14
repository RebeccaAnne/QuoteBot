const path = require('node:path');
const AO3 = require('ao3');
const fs = require("fs");
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { randomIndexSelection } = require('./randomSelection.js');
const { logString } = require('./logging');
const puppeteer = require("puppeteer");

generateFicLink = async (guildId, channelId, allowBingo = true) => {

    // Get the fandom from the server config
    let serverConfig = require(path.join(__dirname, "./data/server-config-" + guildId + ".json"));
    let channel = serverConfig.channels[channelId];
    let bingoSpotlight = channel.bingoSpotlight;

    let fic = null;
    let thumbnailFileName = null;
    if (allowBingo && bingoSpotlight) {

        console.log("Bingo Fic!")

        let ficFandomTag = "BingoSpotlight"
        let ficCache = require("./" + ficFandomTag + ".json");

        let randomIndex = randomIndexSelection(guildId, ficFandomTag, ficCache.length, false, false);

        if (randomIndex != undefined) {
            fic = ficCache[randomIndex];
            thumbnailFileName = "TBTFBingoIcon.png"
        }
        else { console.log("Out of Bingo Fics") }
    }

    let ficFandomTag = channel.ficFandomTag;
    let ficCache = require("./" + ficFandomTag + ".json");
    while (!fic) {
        fic = ficCache[randomIndexSelection(guildId, ficFandomTag, ficCache.length, false, false)];
        if (fic.locked) {
            let optIns = {};
            try {
                optIns = JSON.parse(fs.readFileSync(optInFileName, 'utf8'));
            }
            catch { console.log("Failed to load opt-ins from file"); }

            optIns.find((optedInDiscordUser) => {
                optedInDiscordUser.ao3UserNames.find((ao3User) => { })
            });
        }
    }
    console.log(fic)


    let thumbnailAttachement = null;
    let thumbnailUrl = null;
    if (thumbnailFileName) {
        console.log("Adding Thumbnail " + thumbnailFileName)
        thumbnailAttachement = new AttachmentBuilder("./data/Images/" + thumbnailFileName)
        thumbnailUrl = "attachment://" + thumbnailFileName
    }

    // We've got a fic, let's build an embed for it.
    let embed = new EmbedBuilder()
        .setTitle(fic.title)
        .setDescription(fic.summary)
        .setAuthor({ name: fic.author })
        .setURL(fic.link)
        .setFooter({ text: fic.date })
        .setThumbnail(thumbnailUrl)
        .setColor(0x666666);

    return { embeds: [embed], files: thumbnailAttachement ? [thumbnailAttachement] : null };
}

module.exports = {
    generateFicLink
}