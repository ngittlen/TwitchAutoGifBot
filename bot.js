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
let edgeMode = false;
let streamWidth = 1920;
let streamHeight = 1080;

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
    
    if (command.startsWith('!gif')) {
        findGif(command.substring(4).trim(), target, context["display-name"]);
        console.log(`* Executed ${command} command`);
    } else if(command === ("!source")) {
        twitchClient.say(target, `Source code for this bot can be found at https://github.com/ngittlen/TwitchAutoGifBot`);
    } else if(command === "!commandMode" && context.username === process.env.TWITCH_CHANNEL.toLocaleLowerCase()) {
        commandMode = !commandMode;
        console.log(`* Switching commandMode to ${commandMode}`);
    } else if(command === "!edgeMode" && context.username === process.env.TWITCH_CHANNEL.toLocaleLowerCase()) {
        edgeMode = !edgeMode;
        console.log(`* Switching edgeMode to ${edgeMode}`);
    } else if(!commandMode && !command.startsWith("!")) {
        findGif(command, target, context["display-name"]);
        console.log(`* Finding gif with command ${command} target: ${target}`);
    }
}

function findGif (command, target, username) {
    let giphyClient = GphApiClient(process.env.GIPHY_API_KEY);
    const numGifs = 30;
    
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
                console.log("user: " + username);
            if(gifs.length > 10) {
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
