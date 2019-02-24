const dotenv = require('dotenv');
const tmi = require('tmi.js');
dotenv.config();

// Define configuration options
const opts = { 
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: process.env.TWITCH_OAUTH
    },
    channels: [
        process.env.TWITCH_CHANNEL
    ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

function onMessageHandler (target, context, msg, self) {
    if(self) {return;} // Ignore messages from the bot

    // Remove whitespace from chat message
    const commandName = msg.trim();

    if(commandName === '!dice') {
        const num = rollDice();
        client.say(target, `You tolled a ${num}`);
        console.log(`* Executed ${commandName} command`);
    } else {
        console.log(`* Unknown command ${commandName}`);
    }
}

// Function called when the "dice" command is issued
function rollDice () {
    const sides = 6;
    return Math.ceil(Math.random() * sides);
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}
