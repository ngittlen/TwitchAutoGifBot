# TwitchAutoGifBot
A twitch chatbot that automatically converts what people say in chat into gifs that appear in your stream using giphy
![An example gif of a stream covered by cat photos](https://giant.gfycat.com/GiantCompassionateGalago.gif "Example")
![An example of chat for the above gif](https://i.imgur.com/pPnFfvJ.png "chat")

### Dependencies
node.js

Twitch oauth key for your bot's account -- https://twitchapps.com/tmi/

Giphy api key -- https://developers.giphy.com/

### Running the bot
Clone this repo to your computer

Create a .env file with the following variables in this directory:

```
# .env
TWITCH_USERNAME=<your bot's username>
TWITCH_OAUTH=oauth:<your bot's oauth key>
TWITCH_CHANNEL=<your twitch channel>
GIPHY_API_KEY=<your giphy api key>
```

and then run `npm install` and `node bot.js` and everything will start running

Add a new Browser Source overlay on your stream and point it to http://localhost:3000 and the gifs will show up on stream

### Bot commands
Commands are sent to the bot through twitch chat.

The bot turns any line of text in chat into a giphy by passing the line as a search to giphy and grabbing a random result

You (the channel owner) can toggle the bot to only read lines starting with "!gif" with the command !commandMode

If !commandMode is active the bot will only read lines starting with !gif and use the text following that to search

### Future plans:
- Sub only mode?
- Allow customization of number of gifs, gif rating, time they stay on screen, resolution of stream, etc.
- Change all of that ^ with bot commands
- Add options to specify the gif page's port
- Allow users to specify gif urls they want to appear (dangerous!)
- Allow users to give coordinates of where they want gif to appear (dangerous?)
- Start the bot in !commandMode
- Eliminate refresh blink
- Have it live update (unsure how besides maybe encoding all gifs into video stream or maybe canvas element, need to investigate)
- option to have gifs only display around edge of screen
