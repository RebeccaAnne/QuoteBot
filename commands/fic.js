const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, Message } = require('discord.js');
const { generateQuote } = require("../quoteGenerator.js");
const { generateFicLink } = require('../ficLinkGenerator.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fic')
		.setDescription('Replies with a link to a fic from AO3'),
	async execute(interaction) {

		console.log("Getting a fic")
		let fic = await generateFicLink();
		console.log("Got a fic")
		console.log(fic);

		if (fic) {
			console.log("We got a fic!")

			await interaction.reply({ embeds: [fic] });
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