path = require('node:path');
const { SlashCommandBuilder } = require('discord.js');
var fs = require("fs");
const { getOptInMutex } = require('../ficLinkGenerator.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('archive-lock-opt-out')
		.setDescription('Opt out of allowing quote bot to share your archive locked fics')
		.addStringOption(option =>
			option.setName('ao3-user-name')
				.setDescription('User name of the ao3 acount to opt out')
				.setRequired(true))
		.addBooleanOption(option =>
			option.setName('clear-all-data')
				.setDescription('Set to true to clear all data about this ao3 account from quote bot\'s records')),
	async execute(interaction) {

		let ao3UserNameDisplay = interaction.options.getString('ao3-user-name');
		let ao3UserNameKey = ao3UserNameDisplay.toLowerCase();

		let clearData = interaction.options.getBoolean('clear-all-data');

		let optInFileName = "opt-in.json";
		await getOptInMutex().runExclusive(async () => {

			let optIns = {};
			try {
				optIns = require("../" + optInFileName);
			}
			catch { console.log("Failed to load opt-ins from file"); }

			let reply = "";
			let madeChanges = false;
			if (optIns[interaction.user.id] &&
				optIns[interaction.user.id].ao3UserNames[ao3UserNameKey]) {

				reply = "**" + ao3UserNameDisplay + "**";

				// If we were opted in, change the opt in to false, set the scope to empty, and update 
				// the reply to say they opted out
				if (optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].optIn) {
					optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].optIn = false;
					optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope = [];
					reply += " has been opted out of quote bot fic recommendations for archive locked works"
					madeChanges = true;
				}

				// If they asked us to clear data, delete the ao3 user name and update the reply to say 
				// we cleared it from our records
				if (clearData) {
					delete optIns[interaction.user.id].ao3UserNames[ao3UserNameKey];

					if (madeChanges)
						reply += " and "
					else
						reply += " has been "

					reply += "removed from quote bot's records!"
					madeChanges = true;
				}
				else {
					reply += "!"
				}
			}
			if (!madeChanges) {
				reply = "Archive locked fics from **" + ao3UserNameDisplay + "** are not currently opted in."
			}
			else if (!clearData) {
				optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].timestamp = (new Date()).toDateString();
			}

			interaction.reply({ content: reply, ephemeral: true });

			fs.writeFileSync(optInFileName, JSON.stringify(optIns), () => { });
		})
	},
};