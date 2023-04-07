const path = require('node:path');
const { EmbedBuilder } = require('discord.js');
const { logString } = require('./logging');

module.exports = {
    buildError: async (guildId, channelId, action) => {

        logString("Generating error for " + guildId + ", " + channelId + ", " + action);

        let serverConfig = require(path.join(__dirname, "./data/server-config-" + guildId + ".json"));
        serverSupported = serverConfig != undefined;

        logString("Server supported? " + serverSupported);

        let channelSupported = false;
        if (serverSupported) {

            let channelConfig = serverConfig.channels[channelId];
            if (channelConfig != undefined) {
                {
                    if (action == "quote") {
                        channelSupported =
                            (channelConfig.rootSourceFile != undefined) &&
                            (channelConfig.quoteRoot != undefined);
                    }
                    else if (action == "fic") {
                        channelSupported = (channelConfig.ficFandomTag != undefined);
                    }
                }
            }
        }

        logString("Channel supported? " + channelSupported);

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
                    (channel.rootSourceFile != undefined) &&
                    (channel.quoteRoot != undefined)) {
                    supportedChannels += "\t# " + channel.description + "\n";
                    logString("Found Supported channel: " + channel.description);
                }
                else if ((action == "fic") &&
                    (channel.ficFandomTag != undefined)) {
                    supportedChannels += "\t# " + channel.description + "\n";
                    logString("Found Supported channel: " + channel.description);
                }
                else {
                    logString("Unsupported channel: " + channel.description);
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

        logString(errorString);

        return new EmbedBuilder()
            .setDescription(errorString)
    }
}