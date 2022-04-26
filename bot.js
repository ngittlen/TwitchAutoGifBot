const dotenv = require('dotenv');
const tmi = require('tmi.js');
const GphApiClient = require('giphy-js-sdk-core');
dotenv.config();
const express = require('express');
const app = express();
const port = 3000;

let gifs = [];
let gifsQueue = [];

let commandMode = true;
let edgeMode = false;
let noOverlapMode = true;
let oneAtATimeMode = false;
let fullscreenMode = false;
let offlineDebugMode = false;

let streamWidth = process.env.STREAM_WIDTH;
let streamHeight = process.env.STREAM_HEIGHT-36; //-36 to account for size of Giphy png.
let gifRating = process.env.GIF_RATING; // options: "y", "g", "pg", "pg-13", "r", "unrated", "nsfw", ""
let numGifsDisplayed = process.env.DEFAULT_NUM_GIFS; //ex. 10
let eraseDelaySecs = process.env.DEFAULT_GIF_DISPLAY_TIME;    //ex. 30 = 30 seconds
let prevGifWidth = 0;
let prevGifHeight = 0;
let spawnPoints ={ x:0, y:0};
let prevSpawnPoints ={ x:0, y:0};

let intervalId = setInterval(shiftGifs, eraseDelaySecs * 1000);

app.get('/', function (req, res) {
    res.render('gifPage', {"gifs": gifs, "offlineDebugMode": offlineDebugMode});
});

app.listen(port, function() {
    console.log('Gif page displaying on port ' + port);
});

app.set('view engine', 'ejs');
//load images folder into ejs. all images in the folder, don't need to reference the folder. just say src="name.png"
app.use(express.static('images'));

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
    if(self 
        || context.username === "profsolgy"
        || context.username === "streamelements"
        || context.username === "Nightbot") {return;} // Ignore messages from the bots (add your own here)

    // Remove whitespace from chat message
    const command = msg.trim();
    const channelName = process.env.TWITCH_CHANNEL.toLocaleLowerCase();

    let isMod = context.mod;
    let isHost = context.username === channelName ? true : false;
    let isApprovedUser = (isMod || isHost);
    let reply = "";
    
    // Commands: !gif <gifname>, !source, !edgeMode, !gifRating <rating>, !numGifs <gifs>, !gifTimeout <secs>,
    if (command.toLocaleLowerCase().startsWith('!gif ')) {
        findGif(command.substring(4).trim(), target, context["display-name"]);
        console.log(`* Finding gif with command ${command} target: ${target} user: ${context.username} * `);
    } else if (command.toLocaleLowerCase().startsWith('!g ')) {
        findGif(command.substring(2).trim(), target, context["display-name"]);
        console.log(`* Finding gif with command ${command} target: ${target} user: ${context.username} * `);
    } else if(command === ("!source").toLocaleLowerCase()) {
        twitchClient.say(target, `Source code for this bot can be found at https://github.com/JediMegaman/TwitchAutoGifBot * `);
    } else if(command.toLocaleLowerCase() === "!commandmode" && isApprovedUser) {
        commandMode = !commandMode;
        reply = `* Switching commandMode to ${commandMode} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    } else if(command.toLocaleLowerCase() === "!edgemode" && isApprovedUser) {  //display mode switch
        edgeMode = !edgeMode;
        noOverlapMode = !edgeMode;
        fullscreenMode = false;
        oneAtATimeMode = false;

        reply = `* Switching edgeMode to ${edgeMode} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    } else if(command.toLocaleLowerCase() === "!nooverlapmode" && isApprovedUser) {  //display mode switch
        noOverlapMode = !noOverlapMode;
        //if noOverlapMode was just turned off, random mode is on by default now.
        oneAtATimeMode = false;
        fullscreenMode = false;
        edgeMode = false;

        reply = `* Switching noOverlapMode to ${noOverlapMode} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    } else if(command.toLocaleLowerCase().startsWith("!gifrating ") && isApprovedUser) {
        gifRating = command.substring(10).trim();
        reply = `* Switching gifRating to ${gifRating} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    } else if(command.toLocaleLowerCase().startsWith("!numgifs ") && isApprovedUser) {
        numGifsDisplayed = command.substring(8).trim();
        reply = `* Setting numGifsDisplayed to ${numGifsDisplayed} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    } else if(command.toLocaleLowerCase().startsWith("!giftimeout ") && isApprovedUser) {
        eraseDelaySecs = command.substring(11).trim();
        clearInterval(intervalId);
        intervalId = setInterval(shiftGifs, eraseDelaySecs * 1000);

        reply = `* Setting eraseDelaySecs to ${eraseDelaySecs} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    } else if(!commandMode && !command.startsWith("!")) {       //when CommandMode is off, turn all non command messages (normal chat) into gif search commands.
        findGif(command, target, context["display-name"]);

        console.log(`* Finding gif with command ${command} target: ${target} user: ${context.username} rating: ${gifRating} * `);
    } else if(command.toLocaleLowerCase().startsWith("!clear") && isApprovedUser) {
        clearGifs();

        console.log(`* Clearing all gifs from the stream. `);
    } else if(command.toLocaleLowerCase().startsWith("!oneatatimemode") && isApprovedUser){  //display mode switch
        oneAtATimeMode = !oneAtATimeMode;
        noOverlapMode = !oneAtATimeMode; //default alternate random mode.
        edgeMode = false;
        fullscreenMode = false;

        if(oneAtATimeMode){
            numGifsDisplayed = 1;
            if(eraseDelaySecs > 10){ //probably shouldn't have users waiting too long to see the gifs they queued.
                eraseDelaySecs = 8;
            }
            clearInterval(intervalId);
            intervalId = setInterval(shiftGifs, eraseDelaySecs * 1000);
        } else {
            numGifsDisplayed = process.env.DEFAULT_NUM_GIFS;
        }
        reply = `* Switching OneAtATimeMode to ${oneAtATimeMode} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    } else if(command.toLocaleLowerCase() === "!fullscreenmode" && isApprovedUser) {  //display mode switch
        fullscreenMode = !fullscreenMode;
        oneAtATimeMode = false;
        noOverlapMode = false;
        edgeMode = false;

        reply = `* Switching fullscreenMode to ${fullscreenMode} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    } else if(command.toLocaleLowerCase().startsWith("!debug") && isApprovedUser) {
        offlineDebugMode = !offlineDebugMode;
        reply = `* Setting Debug Mode to ${offlineDebugMode} * `;
        console.log(reply);
        twitchClient.say(target, "Bot: " + reply);
    }
}

function findGif (command, target, username) {
    let giphyClient = GphApiClient(process.env.GIPHY_API_KEY);
    let numGifs = 30;

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
            //console.log("Used keywords " + command + " " + JSON.stringify(response.data, null, 4) + " number: " + gifNumber);
            // twitchClient.say(target, response.data[gifNumber].images.original.url);
            let width = parseInt(response.data[gifNumber].images.original.width);
            let height = parseInt(response.data[gifNumber].images.original.height);
            let unit = "px";
            let fullMode = ";";
            let top, left;
            if(noOverlapMode) {
                spawnPoints = getOpenRandomSpawnPoint(streamWidth - width, streamHeight - height, width, height);
                left = spawnPoints.x;
                top = spawnPoints.y;
            } else if(edgeMode) {
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
            } /*else if(oneAtATimeMode) {
                //TODO.

            }*/ else if(fullscreenMode) {
                unit = "";
                fullMode = ";max-width:100%; max-height:100%;";
                width = "auto";
                height = "auto";
                top = 0;
                left = 0;
            } else {
                top = randomNum(streamHeight - height);
                left = randomNum(streamWidth - width);
            }

            //save new imgSpawnPoints and sizes
            prevSpawnPoints.x = left;
            prevSpawnPoints.y = top;
            prevGifWidth = width;
            prevGifHeight = height;

            gifs.push({"src":response.data[gifNumber].images.original.url, "top": top,
             "left": left,"width": width, "height": height, "unit": unit,
             "prompt": command, "username": username});
            if(gifs.length > numGifsDisplayed && !oneAtATimeMode) {
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

/**
 * Clear all of the gifs on screen out, by emptying this array.
 */
function clearGifs() {
    gifs = [];
}
 /**
  * doesImgOverlap: Checks if the specified corner of an image overlaps with the previous image created.
  * returns true if yes.
  * @param {int} spawnPoint 
  * @param {int} prevImgStart 
  * @param {int} prevImgEnd 
  * @returns {boolean} true or false
  */
function doesImgOverlap(spawnPoint, prevImgStart, prevImgEnd){
    let overlaps = false;
    if(spawnPoint >= prevImgStart && spawnPoint <= prevImgEnd){
        overlaps = true;
    }
    return overlaps;
}

/**
 * getOpenRandomSpawnPoint : generates random x and y coordinates, until it finds one set that isn't inside the 4 corners of the previously randomly generated gif coordinates.
 * @param {int} x_pixels 
 * @param {int} y_pixels 
 * @param {int} xSize 
 * @param {int} ySize 
 * @returns {int, int} {x coordinate, y coordinate}
 */
function getOpenRandomSpawnPoint(x_pixels, y_pixels, xSize, ySize){
    var x = 0;
    var y = 0;
    var count = 0; // infinite recursion protection

    do {
        x = randomNum(x_pixels);
        y = randomNum(y_pixels);
        if (count++ > 200) {
            console.log('give up');
            return {x, y};
        }
    } while ( (doesImgOverlap(x, prevSpawnPoints.x, prevSpawnPoints.x+prevGifWidth) && doesImgOverlap(y, prevSpawnPoints.y, prevSpawnPoints.y+prevGifHeight) )
            || (doesImgOverlap(x+xSize, prevSpawnPoints.x, prevSpawnPoints.x+prevGifWidth) && doesImgOverlap(y+ySize, prevSpawnPoints.y, prevSpawnPoints.y+prevGifHeight))
            || (doesImgOverlap(x+xSize, prevSpawnPoints.x, prevSpawnPoints.x+prevGifWidth) && doesImgOverlap(y, prevSpawnPoints.y, prevSpawnPoints.y+prevGifHeight))
            || (doesImgOverlap(x, prevSpawnPoints.x, prevSpawnPoints.x+prevGifWidth) && doesImgOverlap(y+ySize, prevSpawnPoints.y, prevSpawnPoints.y+prevGifHeight))
            || ( (x+x.xSize) >= streamWidth || (y+ySize) >= streamHeight ) );

    console.log(`x: ${x}, y: ${y}, xSize: ${xSize}, height: ${ySize}, prev.x: ${prevSpawnPoints.x}, prev.y: ${prevSpawnPoints.y}, prev.width: ${prevGifWidth}, prev.height: ${prevGifHeight}, endSpawn.x: ${x+xSize}, endSpawn.y: ${y+ySize}, prevEndSpawn.x: ${prevSpawnPoints.x+prevGifWidth}, prevEndSpawn.y: ${prevSpawnPoints.y+prevGifHeight}.`);

    return {x, y};
}

/* overlap checker example - for future feature

    var targetWidth = template.offsetWidth;
    var targetHeight = template.offsetHeight;
    var x_pixels = window.innerWidth - targetWidth;
    var y_pixels = window.innerHeight - targetHeight;
    var x_midScreen = window.innerWidth / 2;
    var y_midScreen = window.innerHeight / 2;
    function spawnTargets (numberOfSpawns) {
        var targets = [];
        var count = 0; // infinite recursion protection
        for (var i = 0; i < numberOfSpawns; i++) {
            do {
                do {
                    var x = Math.floor(Math.random()*x_pixels);
                    var y = Math.floor(Math.random()*y_pixels);
                    if (count++ > 200) {
                        console.log('give up');
                        return;
                    }
                } while ((x >= x_midScreen-450 && x <= x_midScreen+300) && (y >= y_midScreen-350 || y <= y_midScreen+200));

                for (var j = 0; j < i; j++) {
                    if (x >= targets[j].x - targetWidth && x <= targets[j].x + targetWidth && 
                        y >= targets[j].y - targetHeight && y <= targets[j].y + targetHeight) break; // not ok!
                }
            } while (j < i);
            targets.push({x, y});

            img = document.createElement('img');
            img.src = template.src;
            img.setAttribute('width', targetWidth + 'px');
            img.setAttribute('height', targetHeight + 'px');
            img.className = template.className;
            targetCollection.appendChild(img);
            img.style.left = x + "px";
            img.style.top = y + "px";
        }
    }
    spawnTargets(3);

*/