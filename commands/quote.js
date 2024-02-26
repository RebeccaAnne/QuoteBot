const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, Message } = require('discord.js');
const { generateQuote } = require("../quoteGenerator.js");
const { buildError } = require('../error.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quote')
		.setDescription('Replies with a quote appropriate to the current channel'),
	async execute(interaction) {

		await interaction.deferReply();

		let quote = await generateQuote(interaction.guildId, interaction.channelId);
		if (quote) {
			await interaction.editReply(quote);
		}
		else {
			await interaction.editReply({
				embeds: [await buildError(interaction.guildId, interaction.channelId, "quote")], ephemeral: true
			});
		}
	}
};