const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, Message } = require('discord.js');
const { generateQuote } = require("../quoteGenerator.js");
const { generateFicLink } = require('../ficLinkGenerator.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fic')
		.setDescription('Replies with a link to a fic from AO3'),
	async execute(interaction) {

		// Check that we're in the fic channel
		let serverConfig = require(path.join(__dirname, "../data/server-config-" + interaction.guildId + ".json"));


		console.log(interaction.channelId);
		console.log(serverConfig.fic.channel);

		// If we're not in the fic channel return an error
		if (interaction.channelId != serverConfig.fic.channel) {
			await interaction.reply({
				embeds: [new EmbedBuilder()
					.setDescription("Please run the fic command in " + serverConfig.channels[serverConfig.fic.channel].description)],
				ephemeral: true
			});
			return;
		}

		// defer the reply because the ao3 queries can take long enough to time out the regular reply
		await interaction.deferReply();

		let fic = await generateFicLink(interaction.guildId);
		console.log(fic);

		if (fic) {
			console.log("We got a fic!")

			await interaction.editReply({ embeds: [fic] });
		}
		else {
			await interaction.editReply({
				embeds: [new EmbedBuilder()
					.setDescription("Failed to get fic :( ")],
				ephemeral: true
			});
		}
	},
};