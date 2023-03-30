const path = require('node:path');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    buildError: async (guildId, channelId, action) => {

        console.log("Generating error for " + guildId + ", " + channelId + ", " + action);

        let serverConfig = require(path.join(__dirname, "./data/server-config-" + guildId + ".json"));
        serverSupported = serverConfig != undefined;

        console.log("Server supported? " + serverSupported);

        let channelSupported = false;
        if (serverSupported) {

            let channelConfig = serverConfig.channels[channelId];
            if (channelConfig != undefined) {
                {
                    if (action == "quote") {
                        channelSupported =
                            (channelConfig.quoteSourceFile != undefined) &&
                            (channelConfig.quoteRoot != undefined);
                    }
                    else if (action == "fic") {
                        channelSupported = (channelConfig.ficFandomTag != undefined);
                    }
                }
            }
        }

        console.log("Channel supported? " + channelSupported);

        let errorString = ""
        if (!serverSupported) {
            errorString = "This server is not configured for " + "/" + action;
        }
        else if (!channelSupported) {

            let channels = Object.values(serverConfig.channels);

            //BECKYTODO - I should be able to get these names from the server i think
            let supportedChannels = "";
            channels.forEach(channel => {
                if ((action == "quote") &&
                    (channel.quoteSourceFile != undefined) &&
                    (channel.quoteRoot != undefined)) {
                    supportedChannels += "\t# " + channel.description + "\n";
                    console.log("Found Supported channel: " + channel.description);
                }
                else if ((action == "fic") &&
                    (channel.ficFandomTag != undefined)) {
                    supportedChannels += "\t# " + channel.description + "\n";
                    console.log("Found Supported channel: " + channel.description);
                }
                else {
                    console.log("Unsupported channel: " + channel.description);
                }
            })

            if (supportedChannels == "") {
                errorString = "/" + action + " is not supported in this server"
            }
            else {
                errorString = "/" + action + " not available in this channel. Supported channels are: \n" + supportedChannels;
            }
        }
        else {
            errorString = "/" + action + " failed"
        }

        console.log(errorString);

        return new EmbedBuilder()
            .setDescription(errorString)
    }
}