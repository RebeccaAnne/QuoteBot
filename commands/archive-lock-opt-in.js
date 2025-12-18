path = require('node:path');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
var fs = require("fs");
const { getOptInMutex } = require('../ficLinkGenerator.js');

const THIS_SERVER_SCOPE = "this-server";
const ALL_SERVERS_SCOPE = "all";

const APPROVED = "Approved"
const REJECTED = "Rejected"
const PENDING = "Pending"

module.exports = {
	data: new SlashCommandBuilder()
		.setName('archive-lock-opt-in')
		.setDescription('Opt into allowing quote bot to share your archive locked fics')
		.addStringOption(option =>
			option.setName('ao3-user-name')
				.setDescription('User name of the a03 acount to opt-in')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('scope')
				.setDescription('Where quote bot can recommend your locked fics')
				.setAutocomplete(true)
				.setRequired(true)),
	async execute(interaction) {

		let ao3UserNameDisplay = interaction.options.getString('ao3-user-name');
		let ao3UserNameKey = ao3UserNameDisplay.toLowerCase();
		let newScope = interaction.options.getString('scope');

		let optInFileName = "opt-in.json";
		let sendApprovalRequest = false;
		await getOptInMutex().runExclusive(async () => {

			let optIns = {};
			try {
				optIns = JSON.parse(fs.readFileSync(optInFileName, 'utf8'));
			}
			catch { console.log("Failed to load opt-ins from file"); }

			// If we don't have an opt in object for this discord user, create one.
			if (!optIns[interaction.user.id]) {
				optIns[interaction.user.id] = {};
				optIns[interaction.user.id].username = interaction.user.username;
				optIns[interaction.user.id].globalName = interaction.user.globalName;
				optIns[interaction.user.id].ao3UserNames = {};
			}

			if (!optIns[interaction.user.id].ao3UserNames[ao3UserNameKey]) {
				// If this is the first time we're seeing this ao3UserNameKey, intialize a new object
				// with an empty scope array and a "Pending" approval status. We'll send an approval
				// request for this new ao3/discord pairing
				optIns[interaction.user.id].ao3UserNames[ao3UserNameKey] = {}
				optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].displayName = ao3UserNameDisplay;
				optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].approval = PENDING
				optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope = []
				sendApprovalRequest = true;
				console.log("New user name, send an approval request: " + ao3UserNameDisplay)
			}

			let prevOptedIn = optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].optIn;
			let prevApprovalStatus = optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].approval;
			let prevScope = optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope;

			let scopeChanged = true;
			if (optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope == ALL_SERVERS_SCOPE) {
				// If we're already opted into all, neither adding this one server nor setting it to 
				// all will change anything
				scopeChanged = false;
			}
			else if (newScope == THIS_SERVER_SCOPE &&
				// If they're adding this server check if it's already in our scope. If we find it nothing's changing
				optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope.find(guild => guild.id === interaction.guild.id)) {
				scopeChanged = false;
			}

			// If nothing's changed and they're already approved, just tell them that and return
			let reply = ""
			if (prevOptedIn && prevApprovalStatus === APPROVED && !scopeChanged) {
				reply = ao3UserNameDisplay + " is already opted into quote bot"
				if (newScope != ALL_SERVERS_SCOPE) {
					if (prevScope == ALL_SERVERS_SCOPE) {
						// If they're trying to opt in a single server, but they're already opted into 
						// all, emphasize that.
						reply += " for all servers"
					}
					else {
						// If they're already opted into this server say that
						reply += " for " + interaction.guild.name;
					}
				}
				interaction.reply({ content: reply, ephemeral: true });
				return;
			}

			// If they were previously rejected, reset the status to pending (i guess?)
			if (prevApprovalStatus == REJECTED) {
				optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].approval = PENDING
				console.log("Previously rejected user name, send an approval request: " + ao3UserNameDisplay)
				sendApprovalRequest = true
			}

			// Set optin to true and set the time stamp
			optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].optIn = true;
			optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].timestamp = (new Date()).toDateString();

			// Update the scope
			if (scopeChanged) {
				if (newScope == ALL_SERVERS_SCOPE) {
					// If they've changed the scope to all, set that
					optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope = ALL_SERVERS_SCOPE
				}
				else {
					// If they're adding this server, add it to the scope array
					optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].scope.push({ id: interaction.guild.id, name: interaction.guild.name })
				}
			}

			// Construct a reply message
			let pending = optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].approval === PENDING
			reply = "**" + ao3UserNameDisplay + "**"
			if (pending) {
				reply += " is **Pending Approval** for"
			}
			else {
				reply += " has been opted into"
			}
			reply += " quote bot fic recommendations"
			if (newScope != ALL_SERVERS_SCOPE && prevScope != ALL_SERVERS_SCOPE) {
				// If they've added a single server, add that to the message
				reply += " in **" + interaction.guild.name + "**"
			}
			if ((newScope == ALL_SERVERS_SCOPE && prevScope.length > 0) ||
				(newScope == THIS_SERVER_SCOPE && prevScope == ALL_SERVERS_SCOPE)) {
				// Emphasize all servers scope if 
				// (a) we're changing from individual to all or
				// (b) it's already all and they passed in this server
				reply += " for all servers"
			}

			if (pending) {
				reply += ". Call `/archive-lock-opt-in-status` to check the status of your request, or contact <@849484174657323038> for more information."
			}
			else {
				reply += "!"
			}

			// Send the reply
			interaction.reply({ content: reply, ephemeral: true });

			// Update the file
			fs.writeFileSync(optInFileName, JSON.stringify(optIns), () => { });
		});

		// If this is a new pairing, send an approval request to the test server
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
				content: `Discord User **${interaction.user.globalName}** (${interaction.user.username}) from **${interaction.guild.name}** wants to opt in ao3 user name **${ao3UserNameDisplay}**!`,
				components: [buttonRow]
			});

			// Response collector for the Buttons
			const buttonCollector = approvalMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3_600_000 });
			buttonCollector.on('collect', async buttonInteration => {
				await getOptInMutex().runExclusive(async () => {

					try {
						optIns = JSON.parse(fs.readFileSync(optInFileName, 'utf8'));
					}
					catch { console.log("Failed to load opt-ins from file"); }

					let buttonInteractionText = "Opt-in ";
					if (buttonInteration.customId === 'approve') {
						optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].approval = APPROVED
						buttonInteractionText += " Approved ";
					}
					else if (buttonInteration.customId == 'reject') {
						optIns[interaction.user.id].ao3UserNames[ao3UserNameKey].approval = REJECTED
						buttonInteractionText += " Rejected ";
					}
					buttonInteractionText += "for **" + interaction.user.globalName +
						"** (" + interaction.user.username + "): **" + ao3UserNameDisplay + "**!";

					fs.writeFileSync(optInFileName, JSON.stringify(optIns), () => { });
					await buttonInteration.update({ content: buttonInteractionText, components: [] })
				});
			});
		}
	},
	async autocomplete(interaction) {
		interaction.respond([
			{ name: 'Allow links to my locked works to be recommended in any server where quote bot runs ', value: ALL_SERVERS_SCOPE },
			{ name: 'Allow links to my locked works to be recommended in ' + interaction.guild.name, value: THIS_SERVER_SCOPE }])
	}
};