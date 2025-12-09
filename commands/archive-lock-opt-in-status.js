path = require('node:path');
const { SlashCommandBuilder, UserSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
var fs = require("fs");



module.exports = {
	data: new SlashCommandBuilder()
		.setName('archive-lock-opt-in-status')
		.setDescription('Shows your current status for ao3 accounts opted into sharing archive locked fics'),
	async execute(interaction) {

		let optInFileName = "opt-in.json";

		let optIns = {};
		try {
			optIns = JSON.parse(fs.readFileSync(optInFileName, 'utf8'));
		}
		catch { console.log("Failed to load opt-ins from file"); }

		let reply = "";
		if (!optIns[interaction.user.id]) {
			reply = "No quote bot opt-ins for archive locked fics are registered for **" + interaction.user.username +
				"**. Call **/archive-lock-opt-in** to register an opt-in."
		}
		else {
			for (var registeredAo3Name in optIns[interaction.user.id].ao3UserNames) {
				if (!optIns[interaction.user.id].ao3UserNames[registeredAo3Name].optIn) {
					reply += "Ao3 username **" + registeredAo3Name +
						"** is **not** opted into quote bot recommendations for archive locked fics."
				}
				else {
					if (optIns[interaction.user.id].ao3UserNames[registeredAo3Name].approval === "Approved") {
						reply += "Ao3 username **" + registeredAo3Name +
							"** is opted **in** to quote bot recommendations for archive locked fics."
					}
					else if (optIns[interaction.user.id].ao3UserNames[registeredAo3Name].approval === "Pending") {
						reply += "Opt in for ao3 username **" + registeredAo3Name +
							"** is **Pending Approval**. Contact Alura for any questions."
					}
					else {
						reply += "Opt in for ao3 username **" + registeredAo3Name +
							"** has been **Rejected**. This is usually because we were unable to confirm that user name **"
							+ interaction.user.username + "** is the owner of ao3 account **" + registeredAo3Name
							+ "**. Contact Alura for any questions or to confirm your account."
					}
					reply += "\n";
				}
			}
		}

		interaction.reply({ content: reply, ephemeral: true });
	},
};