const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, Message } = require('discord.js');
const { generateQuote } = require("../quoteGenerator.js");
const { generateFicLink } = require('../ficLinkGenerator.js');
const { buildError } = require('../error.js');
const { logString } = require('../logging');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('archive-lock-opt-in')
		.setDescription('Opts in to allowing quote bot to share archive locked fics')
		.addBooleanOption(option =>
			option.setName('opt-in')
				.setDescription('True to opt in archive locked fics to quote bot')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('ao3-user-name')
				.setDescription('User name of the a03 acount to opt in')
				.setRequired(true)),
	async execute(interaction) {

		let optIn = interaction.options.getBoolean('opt-in');
		let ao3UserName = interaction.options.getString('ao3-user-name');

		console.log(interaction)
		console.log(interaction.user)

		interaction.reply("opt-in: " + optIn + " ao3: " + ao3UserName + " discord: " + interaction.user.globalName);

		let optInFileName = "./opt-in.json";

		let optIns = {};
		try {
			optIns = require(optInFileName);
		}
		catch { logString("Failed to load opt-ins from file"); }

		let userOptInStatus = optIns[interaction.user.id];
		if (!userOptInStatus) {
			userOptInStatus = {};
		}

		if (!userOptInStatus[ao3UserName]) {
			userOptInStatus[ao3UserName] = {}
		}

		userOptInStatus[ao3UserName].optIn = optIn;

		if (!optIn) {
			interaction.reply("opt-in: " + optIn + " ao3: " + ao3UserName + " discord: " + interaction.user.globalName);
		}

		// // Check that we're in the fic channel
		// let serverConfig = require(path.join(__dirname, "../data/server-config-" + interaction.guildId + ".json"));

		// console.log(interaction.channelId);

		// // Ao3 queries can take long enough to timeout if we don't defer the reply, make sure we're 
		// // going to have what we need before we do that though, so that if we need an error message 
		// // it can be ephemeral in the common error cases
		// if ((serverConfig != undefined) &&
		// 	(serverConfig.channels != undefined) &&
		// 	(serverConfig.channels[interaction.channelId] != undefined) &&
		// 	(serverConfig.channels[interaction.channelId].ficFandomTag != undefined)) {
		// 	await interaction.deferReply();

		// 	let fic;
		// 	try {
		// 		fic = await generateFicLink(interaction.guildId, interaction.channelId, true);
		// 	}
		// 	catch (error) {
		// 		logString("\n+++\ngenerateFicLink failed in fic command\n" + error + "\n+++\n");
		// 		await interaction.editReply({
		// 			embeds: [await buildError(interaction.guildId, interaction.channelId, "fic")], ephemeral: true
		// 		});
		// 	}

		// 	if (fic) {
		// 		console.log("We got a fic!")

		// 		await interaction.editReply(fic);
		// 	}
		// 	else {

		// 		await interaction.editReply({
		// 			embeds: [await buildError(interaction.guildId, interaction.channelId, "fic")]
		// 		});
		// 	}
		// }
		// else {
		// 	await interaction.reply({
		// 		embeds: [await buildError(interaction.guildId, interaction.channelId, "fic")], ephemeral: true
		// 	});
		// }
	},
};