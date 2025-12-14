path = require('node:path');
const { SlashCommandBuilder, UserSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
var fs = require("fs");

const THIS_SERVER_SCOPE = "this-server";
const ALL_SERVERS_SCOPE = "all";

const APPROVED = "Approved"
const REJECTED = "Rejected"
const PENDING = "Pending"

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
		if (!optIns[interaction.user.id] || (Object.keys(optIns[interaction.user.id].ao3UserNames).length === 0)) {
			reply = "No quote bot opt-ins for archive locked fics are registered for **" + interaction.user.username +
				"**. Call **/archive-lock-opt-in** to register an opt-in."
		}
		else {
			for (var ao3UserNameKey in optIns[interaction.user.id].ao3UserNames) {
				let ao3UserNameDisplay = optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].displayName;
				if (!optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].optIn) {
					reply += "Ao3 username **" + ao3UserNameDisplay +
						"** is **not** opted into quote bot recommendations for archive locked fics. To opt in call /archive-lock-opt-in. To remove quote bot's record of " + ao3UserNameDisplay + " call /archive-lock-opt-out ao3-user-name: "+ ao3UserNameDisplay +" clear-all-data: true."
				}
				else {
					if (optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].approval === APPROVED) {
						reply += "Ao3 username **" + ao3UserNameDisplay +
							"** is opted in to quote bot recommendations for archive locked fics"
						if (optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope != ALL_SERVERS_SCOPE) {
							if (optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope.length == 1) {
								reply += " in **" + optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope[0].name + "**."
							}
							else {
								reply += " in the following servers:"
								for (let scope of optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope) {
									reply += "\n\t" + scope.name
								}
							}
						}
						else{
							reply += "."
						}
					}
					else if (optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].approval === PENDING) {
						reply += "Opt in for ao3 username **" + ao3UserNameDisplay +
							"** is **Pending Approval**. Contact <@849484174657323038> for any questions."
					}
					else {
						reply += "Opt in for ao3 username **" + ao3UserNameDisplay +
							"** has been **Rejected**. This is usually because we were unable to confirm that discord user **"
							+ interaction.user.username + "** is the owner of ao3 account **" + ao3UserNameDisplay
							+ "**. Contact <@849484174657323038> for any questions or to confirm your account."
					}
					reply += "\n\n";
				}
			}
		}

		interaction.reply({ content: reply, ephemeral: true });
	},
};