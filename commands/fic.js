const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, Message } = require('discord.js');
const { generateQuote } = require("../quoteGenerator.js");
const { generateFicLink } = require('../ficLinkGenerator.js');
const { buildError } = require('../error.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fic')
		.setDescription('Replies with a link to a fic from AO3'),
	async execute(interaction) {

		// Check that we're in the fic channel
		let serverConfig = require(path.join(__dirname, "../data/server-config-" + interaction.guildId + ".json"));

		console.log(interaction.channelId);
		console.log(serverConfig.fic.channel);

		// Ao3 queries can take long enough to timeout if we don't defer the reply, make sure we're 
		// going to have what we need before we do that though, so that if we need an error message 
		// it can be ephemeral in the common error cases
		if ((serverConfig != undefined) &&
			(serverConfig.channels != undefined) &&
			(serverConfig.channels[interaction.channelId] != undefined) &&
			(serverConfig.channels[interaction.channelId].ficFandomTag != undefined)) {
			await interaction.deferReply();

			let fic = await generateFicLink(interaction.guildId, interaction.channelId);
			console.log(fic);
			if (fic) {
				console.log("We got a fic!")

				await interaction.editReply({ embeds: [fic] });
			}
			else {

				await interaction.editReply({
					embeds: [await buildError(interaction.guildId, interaction.channelId, "fic")]
				});
			}
		}
		else {
			await interaction.reply({
				embeds: [await buildError(interaction.guildId, interaction.channelId, "fic")], ephemeral: true
			});
		}
	},
};