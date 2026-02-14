const path = require('node:path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { randomIndexSelection } = require('./randomSelection.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { Mutex } = require('async-mutex');
const fs = require('node:fs');

const APPROVED = "Approved"
const REJECTED = "Rejected"
const PENDING = "Pending"

const THIS_SERVER_SCOPE = "this-server";
const ALL_SERVERS_SCOPE = "all";

let optInMutex;

getOptInMutex = () => {
    if (!optInMutex) {
        optInMutex = new Mutex();
    }
    return optInMutex;
}

getOptInAo3Names = () => {

    let optInFileName = "opt-in.json";
    let optIns = {};
    try {
        optIns = JSON.parse(fs.readFileSync(optInFileName, 'utf8'));
    }
    catch { console.log("Failed to load opt-ins from file"); }

    let optedInAo3NameArray = []
    for (let discordUser in optIns) {
        for (let ao3Name in optIns[discordUser].ao3UserNames) {
            if (optIns[discordUser].ao3UserNames[ao3Name].optIn &&
                optIns[discordUser].ao3UserNames[ao3Name].approval === APPROVED) {
                optedInAo3NameArray.push(optIns[discordUser].ao3UserNames[ao3Name])
            }
        }
    }
    return optedInAo3NameArray;
}

isFicOptedIn = (author, ao3OptIns, guildId) => {
    return ao3OptIns.find((optedInAo3Account) => {
        // Split multiple authors into an array of authors
        let authorArray = author.split(",");

        // look for this optedInAo3Account in the array of authors
        let authorMatch = authorArray.find((splitAuthor) => {
            splitAuthor = splitAuthor.trim().toLowerCase();

            // If the author is of the form name1 (name2) this represents multiple ao3 psueds.
            // Consider this author opted-in if either name matches an opted-in username
            let paren1Index = splitAuthor.indexOf("(")
            let paren2Index = splitAuthor.indexOf(")")
            if (paren1Index != -1) {
                name1 = splitAuthor.slice(0, paren1Index).trim();
                name2 = splitAuthor.slice(paren1Index + 1, paren2Index).trim();
                return (optedInAo3Account.displayName.toLowerCase() == name1.toLowerCase()) ||
                    (optedInAo3Account.displayName.toLowerCase() == name2.toLowerCase())
            }
            else {
                return optedInAo3Account.displayName.toLowerCase() == splitAuthor.toLowerCase();
            }
        })

        // If we found an author match, make sure the guild matches
        let guildMatch = true;
        if (guildId) {
            // If we were passed a guild, make sure it matches
            if (optedInAo3Account.scope == ALL_SERVERS_SCOPE) {
                guildMatch = true;
            }
            else {
                guildMatch = optedInAo3Account.scope.find((scopeGuild) => {
                    return scopeGuild.id == guildId
                })
            }
        }

        return authorMatch && guildMatch;
    })
}

sendApprovalRequest = async (client, approvalRequestData) => {
    let approvalChannel = await client.channels.fetch("1447820720892547112", { force: true });

    const approve = new ButtonBuilder()
        .setCustomId('approve')
        .setLabel('Approve')
        .setStyle(ButtonStyle.Primary);

    const reject = new ButtonBuilder()
        .setCustomId('reject')
        .setLabel('Reject')
        .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder()
        .addComponents(approve, reject);

    let approvalMessage = await approvalChannel.send({
        content: `Discord User **${approvalRequestData.globalName}** (${approvalRequestData.username}) from **${approvalRequestData.guildName}** wants to opt in ao3 user name **${approvalRequestData.ao3UserNameKey}**!`,
        components: [buttonRow]
    });

    // Response collector for the Buttons
    const buttonCollector = approvalMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });
    buttonCollector.on('collect', async buttonInteration => {
        await getOptInMutex().runExclusive(async () => {

            let optInFileName = "opt-in.json";
            let optIns = {}
            try {
                optIns = JSON.parse(fs.readFileSync(optInFileName, 'utf8'));
            }
            catch { console.log("Failed to load opt-ins from file"); }

            let buttonInteractionText = "Opt-in ";
            if (buttonInteration.customId === 'approve') {
                optIns[approvalRequestData.userId].ao3UserNames[approvalRequestData.ao3UserNameKey].approval = APPROVED
                buttonInteractionText += " Approved ";
            }
            else if (buttonInteration.customId == 'reject') {
                optIns[approvalRequestData.userId].ao3UserNames[approvalRequestData.ao3UserNameKey].approval = REJECTED
                buttonInteractionText += " Rejected ";
            }
            buttonInteractionText += "for **" + approvalRequestData.globalName +
                "** (" + approvalRequestData.username + "): **" + approvalRequestData.ao3UserNameKey + "**!";

            fs.writeFileSync(optInFileName, JSON.stringify(optIns), () => { });
            await buttonInteration.update({ content: buttonInteractionText, components: [] })
        });
    });
}

sendPendingOptInRequests = async (client) => {

    let optInFileName = "opt-in.json";
    let optIns = {}
    try {
        optIns = JSON.parse(fs.readFileSync(optInFileName, 'utf8'));
    }
    catch { console.log("Failed to load opt-ins from file"); }

    for (let discordUserId in optIns) {

        let discordUser = optIns[discordUserId];

        for (let ao3Name in discordUser.ao3UserNames) {
            if (discordUser.ao3UserNames[ao3Name].approval == PENDING) {
                let approvalRequestData = {
                    globalName: discordUser.globalName,
                    username: discordUser.username,
                    guildName: "Start up",
                    ao3UserNameKey: ao3Name,
                    userId: discordUserId
                }
                sendApprovalRequest(client, approvalRequestData)
            }
        }
    }
}

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
            thumbnailFileName = "TBTFFanoaaryIcon.png"
        }
        else { console.log("Out of Bingo Fics") }
    }

    let ficFandomTag = channel.ficFandomTag;
    let ficCache = require("./" + ficFandomTag + ".json");
    let ao3OptIns = null;
    while (!fic) {
        index = randomIndexSelection(guildId, ficFandomTag, ficCache.length, false, true);
        fic = ficCache[index];
        console.log(fic)

        // If the fic is locked, check it against the opt-ins to make sure it's okay to show it.
        // The opt-in list was used at the time of fic-cache-creation, but we need to check again because
        // (a) at cache creation we include all fics that were opted into at least one guild. We 
        //     don't know if this guild is the one it was opted in for.
        // (b) the author may have opted out since the cache was built.
        if (fic.locked) {
            if (!ao3OptIns) {
                ao3OptIns = getOptInAo3Names();
            }

            // If the fic wasn't opted in, set it to null and try again
            if (!isFicOptedIn(fic.author, ao3OptIns, guildId)) {
                console.log(fic.author + " is not opted in")
                fic = null;
            }
        }
    }

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
    generateFicLink, getOptInAo3Names, isFicOptedIn, getOptInMutex, sendApprovalRequest
}