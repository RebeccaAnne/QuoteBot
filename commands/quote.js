const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, Message } = require('discord.js');
const { generateQuote } = require("../quoteGenerator.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quote')
		.setDescription('Replies with a quote appropriate to the current channel'),
	async execute(interaction) {

		let quote = generateQuote(interaction.guildId, interaction.channelId);
		if (quote) {
			await interaction.reply({ embeds: [quote] });
		}
		else {
			try {
				let serverConfig = require(path.join(__dirname, "../data/server-config-" + interaction.guildId + ".json"));

				let errorString = "No quotes available for this channel. Supported channels are: \n";
				let channels = Object.values(serverConfig.channels);

				//BECKYTODO - I should be able to get these names from the server i think
				channels.forEach(element => {
					errorString += "\t# " + element.description + "\n";
				});

				await interaction.reply({
					embeds: [new EmbedBuilder()
						.setDescription(errorString)], ephemeral: true
				});

			}
			catch (error) {
				await interaction.reply({
					embeds: [new EmbedBuilder()
						.setDescription('No quotes available for this server!')], ephemeral: true
				});
			}
		}
	},
};