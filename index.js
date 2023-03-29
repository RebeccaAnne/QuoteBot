const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, FetchChannelOptions } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { token } = require('./config.json');
const { CronJob } = require('cron');
const { generateQuote } = require("./quoteGenerator.js");
const { generateFicLink } = require('./ficLinkGenerator');

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

const sendMessage = async (guildId, channelId, generateFunction) => {

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
			console.log("Delaying message by " + backofftime)
			setTimeout(() => { sendMessage(guildId, channelId); }, backofftime)
		}
		else {
			let embed = await generateFunction(guildId, channelId);
			channel.send({ embeds: [embed] });
			
		}
	}
	catch (error) { console.log("\n+++\sendMessage failed\n" + error + "\n+++\n"); }
}

const scheduleCronJobs = async (guildId, scheduleConfig, generateFunction) => {

	let channelIndex = 0;
	const job = new CronJob(scheduleConfig.time, async function () {

		try {
			let channelId = scheduleConfig.channels[channelIndex];
			console.log("Running scheduled event in " + channelId);

			await sendMessage(guildId, channelId, generateFunction);

			channelIndex = (channelIndex + 1) % scheduleConfig.channels.length;
		}
		catch (error) {
			console.log("Failed to send message");
			console.log(error);
		}
	}, null, true, scheduleConfig.timezone);
}

serverConfigFiles.forEach(serverConfigFile => {

	const filePath = path.join(dataPath, serverConfigFile);
	console.log(serverConfigFile);
	const serverConfig = require(filePath);

	console.log("Scheduling for " + serverConfig.description + ": " + serverConfig.guildId);

	// Schedule the quotes from the "scheduledQuotes" array in the server config
	if (serverConfig.scheduledQuotes) {
		serverConfig.scheduledQuotes.forEach(scheduledQuote => {
			console.log("Scheduling " + scheduledQuote.description)

			scheduleCronJobs(serverConfig.guildId, scheduledQuote, generateQuote);
		})
	}

	// Schedule the fics from the "scheduledFics" array in the server config 
	if (serverConfig.scheduledFics) {
		serverConfig.scheduledFics.forEach(scheduledFic => {
			console.log("Scheduling " + scheduledFic.description)

			scheduleCronJobs(serverConfig.guildId, scheduledFic, generateFicLink);
		})
	}
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
