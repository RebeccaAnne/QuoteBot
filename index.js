const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, FetchChannelOptions } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const { token } = require('./config.json');
const { CronJob } = require('cron');
const { generateQuote } = require("./quoteGenerator.js");
const { generateFicLink } = require('./ficLinkGenerator');
const { logString } = require('./logging');

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

logString("Command files:");

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	logString(file);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		logString(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const dataPath = path.join(__dirname, 'data');
const serverConfigFiles = fs.readdirSync(dataPath).filter(file => file.startsWith('server-config-'));

logString("server-config files:");


// 10 minutes
const backofftime = 10 * 1000 * 60;

const sendMessage = async (guildId, channelId, generateFunction) => {

	try {
		let channel = await client.channels.fetch(channelId, { force: true });
		let createdTimestamp = (await channel.messages.fetch(channel.lastMessageId)).createdTimestamp;
		logString("Sending Message to " + guildId + ", " + channelId);
		let now = Date.now();
		let difference = now - createdTimestamp;

		if (difference < backofftime) {
			logString("Last Message Timestamp: " + createdTimestamp);
			logString("Current Timestamp:      " + now);
			logString("Time since last message: " + difference);
			logString("Delaying message by " + backofftime)
			setTimeout(() => { sendMessage(guildId, channelId, generateFunction); }, backofftime)
		}
		else {
			let embed = await generateFunction(guildId, channelId);
			channel.send({ embeds: [embed] });

		}
	}
	catch (error) { logString("\n+++\sendMessage failed\n" + error + "\n+++\n"); }
}

const getCurrentChannelIndex = (guildId, scheduleConfig) => {

	if (scheduleConfig.channels.length == 1) {
		// If there's only one channel, the index is always 0
		return 0;
	}
	else {
		let channelIndex = 0;
		let serverArrayFileName = "./arrays-" + guildId + ".json";

		let serverArrays = {};
		try {
			serverArrays = require(serverArrayFileName);

			// If there's an index in the file, increment it and use the next index
			if (serverArrays[scheduleConfig.id + "Index"] != undefined) {
				channelIndex = (serverArrays[scheduleConfig.id + "Index"] + 1) % scheduleConfig.channels.length;
			}
		}
		catch {
			// We don't have a file yet, it will get created below 
			logString("Failed to load serverArrays from file in getCurrentChannelIndex");
		}
		serverArrays[scheduleConfig.id + "Index"] = channelIndex;

		fs.writeFileSync(serverArrayFileName, JSON.stringify(serverArrays), () => { });
		return channelIndex;
	}
}

const scheduleCronJobs = async (guildId, scheduleConfig, generateFunction) => {

	const job = new CronJob(scheduleConfig.time, async function () {

		try {
			let channelIndex = getCurrentChannelIndex(guildId, scheduleConfig);
			let channelId = scheduleConfig.channels[channelIndex];
			logString("Channel index: " + channelIndex + "; Running scheduled event in " + channelId);

			await sendMessage(guildId, channelId, generateFunction);
		}
		catch (error) {
			logString("CronJob failed to send message. Error: " + error);
		}
	}, null, true, scheduleConfig.timezone);
}

serverConfigFiles.forEach(serverConfigFile => {

	const filePath = path.join(dataPath, serverConfigFile);
	logString(serverConfigFile);
	const serverConfig = require(filePath);

	logString("Scheduling for " + serverConfig.description + ": " + serverConfig.guildId);

	// Schedule the quotes from the "scheduledQuotes" array in the server config
	if (serverConfig.scheduledQuotes) {
		serverConfig.scheduledQuotes.forEach(scheduledQuote => {
			logString("Scheduling " + scheduledQuote.description)

			scheduleCronJobs(serverConfig.guildId, scheduledQuote, generateQuote);
		})
	}

	// Schedule the fics from the "scheduledFics" array in the server config 
	if (serverConfig.scheduledFics) {
		serverConfig.scheduledFics.forEach(scheduledFic => {
			logString("Scheduling " + scheduledFic.description)

			scheduleCronJobs(serverConfig.guildId, scheduledFic, generateFicLink);
		})
	}
});

client.once(Events.ClientReady, c => {
	logString(`Ready! Logged in as ${c.user.tag}`);
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
