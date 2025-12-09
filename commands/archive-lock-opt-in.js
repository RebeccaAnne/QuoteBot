path = require('node:path');
const { SlashCommandBuilder, UserSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
var fs = require("fs");



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

		let optInFileName = "opt-in.json";

		let optIns = {};
		try {
			optIns = require("../" + optInFileName);
		}
		catch { console.log("Failed to load opt-ins from file"); }

		console.log(optIns)

		if (!optIns[interaction.user.id]) {
			optIns[interaction.user.id] = {};
			optIns[interaction.user.id].username = interaction.user.username;
			optIns[interaction.user.id].globalName = interaction.user.globalName;
			optIns[interaction.user.id].ao3UserNames = {};
		}

		if (!optIns[interaction.user.id].ao3UserNames[ao3UserName]) {
			optIns[interaction.user.id].ao3UserNames[ao3UserName] = {}
		}

		optIns[interaction.user.id].ao3UserNames[ao3UserName].optIn = optIn;

		let sendApprovalRequest = false;
		let reply = "";
		if (optIns[interaction.user.id].ao3UserNames[ao3UserName].approval === "Approved") {
			reply += "Archive locked fics from **" + ao3UserName + "** have been opted";
			reply += optIn ? " into " : " out of ";
			reply += "quote bot fic recommendations!"
		}
		else if (!optIn) {
			reply += "Archive locked fics from **" + ao3UserName + "** are not currently opted in."
		}
		else {
			optIns[interaction.user.id].ao3UserNames[ao3UserName].approval = "Pending"
			reply += "Opt-in for archive locked fics from ao3 user name **" + ao3UserName + "** is pending approval."
			sendApprovalRequest = true;
		}

		interaction.reply({ content: reply, ephemeral: true });

		console.log(optIns);
		fs.writeFileSync(optInFileName, JSON.stringify(optIns), () => { });

		if (sendApprovalRequest) {
			let approvalChannel = await interaction.client.channels.fetch("1447820720892547112", { force: true });

			const approve = new ButtonBuilder()
				.setCustomId('approve')
				.setLabel('Approve')
				.setStyle(ButtonStyle.Primary);

			const reject = new ButtonBuilder()
				.setCustomId('reject')
				.setLabel('Reject')
				.setStyle(ButtonStyle.Secondary);

			const buttonRow = new ActionRowBuilder()
				.addComponents(approve, reject);

			let approvalMessage = await approvalChannel.send({
				content: `Discord User **${interaction.user.globalName}** (${interaction.user.username}) from **${interaction.guild.name}** wants to opt in ao3 user name **${ao3UserName}**!`,
				components: [buttonRow]
			});

			// Response collector for the Buttons
			const buttonCollector = approvalMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });
			buttonCollector.on('collect', async buttonInteration => {

				let buttonInteractionText = "Opt-in ";
				if (buttonInteration.customId === 'approve') {
					optIns[interaction.user.id].ao3UserNames[ao3UserName].approval = "Approved"
					buttonInteractionText += " Approved ";
				}
				else if (buttonInteration.customId == 'reject') {
					optIns[interaction.user.id].ao3UserNames[ao3UserName].approval = "Rejected"
					buttonInteractionText += " Rejected ";
				}
				buttonInteractionText += "for **" + interaction.user.globalName +
					"** (" + interaction.user.username + "): **" + ao3UserName + "**!";

				console.log(optIns);
				fs.writeFileSync(optInFileName, JSON.stringify(optIns), () => { });

				await buttonInteration.update({ content: buttonInteractionText, components: [] })
			});
		}
	},
};