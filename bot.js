const dotenv = require('dotenv');
const tmi = require('tmi.js');
const GphApiClient = require('giphy-js-sdk-core')
dotenv.config();
const express = require('express');
const app = express();
const port = 3000;

// Todo:    Sub only mode?
//          allow customization of number of gifs, gif rating, time they stay on screen, resolution of stream, etc.

let gifs = [];
let commandMode = false;

setInterval(() => {
    if(gifs.length > 0){
        gifs.shift();
    }
}, 30000);

app.get('/', function (req, res) {
    res.render('gifPage', {"gifs": gifs});
});

app.listen(port, function() {
    console.log('Gif page displaying on port ' + port);
});

app.set('view engine', 'ejs');

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
const twitchClient = new tmi.client(opts);

// Register our event handlers (defined below)
twitchClient.on('message', onMessageHandler);
twitchClient.on('connected', onConnectedHandler);

// Connect to Twitch:
twitchClient.connect();

function onMessageHandler (target, context, msg, self) {
    if(self) {return;} // Ignore messages from the bot

    // Remove whitespace from chat message
    const command = msg.trim();

    if(command === '!dice') {
        const num = rollDice();
        twitchClient.say(target, `You rolled a ${num}`);
        console.log(`* Executed ${command} command`);
    } else if (command.startsWith('!gif')) {
        findGif(command.substring(4).trim(), target);
        console.log(`* Executed ${command} command`);
    } else if(command === ("!source")) {
        twitchClient.say(target, `Source code for this bot can be found at https://github.com/ngittlen/TwitchAutoGifBot`);
    } else if(command === "!commandMode" && context.username === process.env.TWITCH_CHANNEL.toLocaleLowerCase()) {
        commandMode = !commandMode;
        console.log(`* Switching commandMode to ${commandMode}`);
    } else if(!commandMode) {
        findGif(command, target);
        console.log(`* Finding gif with command ${command} target: ${target}`);
    }
}

// Function called when the "dice" command is issued
function rollDice () {
    const sides = 6;
    return Math.ceil(Math.random() * sides);
}

function findGif (command, target) {
    let giphyClient = GphApiClient(process.env.GIPHY_API_KEY);
    const numGifs = 25;
    
    giphyClient.search('gifs', {"q": command, "limit": numGifs, "rating": 'pg-13'})
        .then((response) => {
            if(response.data === null || response.data.length < 1) {
                twitchClient.say(target, `Cannot find gif for ${command}`);
                console.log(`Cannot find gif for ${command}`);
                return;
            }
            if(numGifs > response.data.length) {
                numGifs = response.data.length;
            }
            let gifNumber = randomNum(numGifs);
            // console.log("Used keywords " + command + " " + JSON.stringify(response.data, null, 4) + " number: " + gifNumber);
            // twitchClient.say(target, response.data[gifNumber].images.original.url);
            let width = parseInt(response.data[gifNumber].images.original.width);
            let height = parseInt(response.data[gifNumber].images.original.height);
            gifs.push({"src":response.data[gifNumber].images.original.url, "top": randomNum(1080 - height), "left": randomNum(1920 - width)});
            if(gifs.length > 6) {
                gifs.shift();
            }
        })
        .catch((err) => {
            console.error(err);
        });
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}

function randomNum(maxNum) {
    return Math.floor(Math.random() * maxNum);
}
