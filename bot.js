const dotenv = require('dotenv');
const tmi = require('tmi.js');
const GphApiClient = require('giphy-js-sdk-core')
dotenv.config();
const express = require('express');
const app = express();
const port = 3000;

let gifs = [];
let commandMode = false;
let edgeMode = false;
let streamWidth = process.env.STREAM_WIDTH;
let streamHeight = process.env.STREAM_HEIGHT;
let gifRating = process.env.GIF_RATING; // options: "y", "g", "pg", "pg-13", "r", "unrated", "nsfw", ""
let numGifsDisplayed = 10;
let eraseDelaySecs = 30;

let intervalId = setInterval(shiftGifs, eraseDelaySecs * 1000);

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
    const channelName = process.env.TWITCH_CHANNEL.toLocaleLowerCase();
    
    // Commands: !gif <gifname>, !source, !edgeMode, !gifRating <rating>, !numGifs <gifs>, !gifTimeout <secs>,
    if (command.startsWith('!gif ')) {
        findGif(command.substring(4).trim(), target, context["display-name"]);
        console.log(`* Finding gif with command ${command} target: ${target} user: ${context.username}`);
    } else if(command === ("!source")) {
        twitchClient.say(target, `Source code for this bot can be found at https://github.com/ngittlen/TwitchAutoGifBot`);
    } else if(command === "!commandMode" && context.username === channelName) {
        commandMode = !commandMode;
        console.log(`* Switching commandMode to ${commandMode}`);
    } else if(command === "!edgeMode" && context.username === channelName) {
        edgeMode = !edgeMode;
        console.log(`* Switching edgeMode to ${edgeMode}`);
    } else if(command.startsWith("!gifRating ") && context.username === channelName) {
        gifRating = command.substring(10).trim();
        console.log(`* Switching gifRating to ${gifRating}`);
    } else if(command.startsWith("!numGifs ") && context.username === channelName) {
        numGifsDisplayed = command.substring(8).trim();
        console.log(`* Setting numGifsDisplayed to ${numGifsDisplayed}`);
    } else if(command.startsWith("!gifTimeout ") && context.username === channelName) {
        eraseDelaySecs = command.substring(11).trim();
        clearInterval(intervalId);
        intervalId = setInterval(shiftGifs, eraseDelaySecs * 1000);
        console.log(`* Setting eraseDelaySecs to ${eraseDelaySecs}`);
    } else if(!commandMode && !command.startsWith("!")) {
        findGif(command, target, context["display-name"]);
        console.log(`* Finding gif with command ${command} target: ${target} user: ${context.username} rating: ${gifRating}`);
    }
}

function findGif (command, target, username) {
    let giphyClient = GphApiClient(process.env.GIPHY_API_KEY);
    const numGifs = 30;
    
    giphyClient.search('gifs', {"q": command, "limit": numGifs, "rating": gifRating})
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
            let top, left;
            if(edgeMode) {
                let side = randomNum(4);
                switch(side) {
                    case 0:
                        top = 0;
                        left = randomNum(streamWidth - width);
                        break;
                    case 1: 
                        top = randomNum(streamHeight - height);
                        left = streamWidth - width;
                        break;
                    case 2:
                        top = streamHeight - height;
                        left = randomNum(streamWidth - width);
                        break;
                    case 3:
                        top = randomNum(streamHeight - height);
                        left = 0;
                }
            } else {
                top = randomNum(streamHeight - height);
                left = randomNum(streamWidth - width);
            }
            gifs.push({"src":response.data[gifNumber].images.original.url, "top": top,
             "left": left,"width": width, "height": height, "prompt": command, "username": username});
            if(gifs.length > numGifsDisplayed) {
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

function shiftGifs() {
    if(gifs.length > 0){
        gifs.shift();
    }
}
