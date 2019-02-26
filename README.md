# TwitchAutoGifBot
A twitch chatbot that automatically converts what people say in chat into gifs that appear in your stream using giphy

###Dependencies
node.js
Twitch oauth key for your bot's account -- https://twitchapps.com/tmi/
Giphy api key -- https://developers.giphy.com/

###Running the bot
Clone this repo to your computer
Create a .env file with the following variables in this directory:
```
# .env
TWITCH_USERNAME=<your bot's username>
TWITCH_OAUTH=oauth:<your bot's oauth key>
TWITCH_CHANNEL=<your twitch channel>
GIPHY_API_KEY=<your giphy api key>
```

and then run `npm install` and `node bot.js` and you should be going 

###Bot commands
Commands are sent to the bot through twitch chat.
The bot turns any line of text in chat into a giphy by passing the line as a search to giphy and grabbing a random result
You (the channel owner) can toggle the bot to only read lines starting with "!gif" with the command !commandMode
If !commandMode is active the bot will only read lines starting with !gif and use the text following that to search

###Future plans:
- Sub only mode?
- Allow customization of number of gifs, gif rating, time they stay on screen, resolution of stream, etc.
- Add options to specify the gif page's 
- Allow users to specify gifs they want to appear
- Start the bot in !commandMode