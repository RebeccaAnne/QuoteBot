const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, Message } = require('discord.js');
const { generateFicLink } = require('../ficLinkGenerator.js');
const { buildError } = require('../error.js');
const { logString } = require('../logging');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fic')
		.setDescription('Replies with a link to a fic from AO3'),
	async execute(interaction) {

		// Check that we're in the fic channel
		let serverConfig = require(path.join(__dirname, "../data/server-config-" + interaction.guildId + ".json"));

		console.log(interaction.channelId);

		// Ao3 queries can take long enough to timeout if we don't defer the reply, make sure we're 
		// going to have what we need before we do that though, so that if we need an error message 
		// it can be ephemeral in the common error cases
		if ((serverConfig != undefined) &&
			(serverConfig.channels != undefined) &&
			(serverConfig.channels[interaction.channelId] != undefined) &&
			(serverConfig.channels[interaction.channelId].ficFandomTag != undefined)) {
			await interaction.deferReply();

			let fic;
			//try {
				fic = await generateFicLink(interaction.guildId, interaction.channelId, true);
			// }
			// catch (error) {
			// 	logString("\n+++\ngenerateFicLink failed in fic command\n" + error + "\n+++\n");
			// 	await interaction.editReply({
			// 		embeds: [await buildError(interaction.guildId, interaction.channelId, "fic")], ephemeral: true
			// 	});
			// }

			if (fic) {
				console.log("We got a fic!")

				await interaction.editReply(fic);
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