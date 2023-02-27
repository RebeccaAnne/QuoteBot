const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, FetchChannelOptions } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { token } = require('./config.json');
const { CronJob } = require('cron');
const { generateQuote } = require("./quoteGenerator.js");

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log("Command files:");

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	console.log(file);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const dataPath = path.join(__dirname, 'data');
const serverConfigFiles = fs.readdirSync(dataPath).filter(file => file.startsWith('server-config-'));

console.log("server-config files:");


// 10 minutes
const backofftime = 10 * 1000 * 60;

const sendQuote = async (guildId, channelId) => {

	try {
		let channel = await client.channels.fetch(channelId, { force: true });
		let createdTimestamp = (await channel.messages.fetch(channel.lastMessageId)).createdTimestamp;
		let now = Date.now();
		let difference = now - createdTimestamp;

		console.log("Last message Id: " + channel.lastMessageId);
		console.log("Last Message Timestamp: " + createdTimestamp)
		console.log("Current Timestamp:      " + now)
		console.log("Time since last message: " + difference);

		if (difference < backofftime) {
			console.log("Delaying quote by " + backofftime)
			setTimeout(() => { sendQuote(guildId, channelId); }, backofftime)
		}
		else {
			let quote = generateQuote(guildId, channelId);
			channel.send({ embeds: [quote] });
		}
	}
	catch (error) { console.log("sendQuote failed"); }
}

serverConfigFiles.forEach(serverConfigFile => {

	const filePath = path.join(dataPath, serverConfigFile);
	console.log(serverConfigFile);
	const serverConfig = require(filePath);

	console.log("Scheduling quotes for " + serverConfig.description + ": " + serverConfig.guildId);
	serverConfig.scheduledQuotes.forEach(scheduledQuote => {
		console.log("Scheduling " + scheduledQuote.description)

		let channelIndex = 0;
		const job = new CronJob(scheduledQuote.time, async function () {

			try {
				let channelId = scheduledQuote.channels[channelIndex];
				console.log("Running scheduled quote in " + serverConfig.channels[channelId].description);

				sendQuote(serverConfig.guildId, channelId);

				channelIndex = (channelIndex + 1) % scheduledQuote.channels.length;
			}
			catch (error) {
				console.log("Failed to send quote");
				console.log(error);
			}
		}, null, true, scheduledQuote.timezone);
	})
});

client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ embeds: [new EmbedBuilder().setDescription('There was an error while executing this command!')], ephemeral: true });
	}
});

client.login(token);
