# TwitchAutoGifBot
A twitch chatbot that automatically converts what people say in chat into gifs that appear in your stream using giphy
![An example gif of a stream covered by cat photos](https://i.imgur.com/UA9WBSL.gif "Example")
![An example of chat for the above gif](https://i.imgur.com/pPnFfvJ.png "chat")

### Dependencies
node.js

[Twitch oauth key for your bot's account](https://twitchapps.com/tmi/)

[Giphy api key](https://developers.giphy.com/)

### Running the bot
Clone this repo to your computer

Create a .env file with the following variables in this directory:

```
# .env
TWITCH_USERNAME=<your bot's username. ex. jedi_bot>
TWITCH_OAUTH=oauth:<your bot's oauth key>
TWITCH_CHANNEL=<your twitch channel. ex. jedi_megaman>
STREAM_WIDTH=<width in pixels. ex. 1280>
STREAM_HEIGHT=<height in pixels. ex. 720>
GIPHY_API_KEY=<your giphy api key>
GIF_RATING=<a giphy rating setting> #options: "y", "g", "pg", "pg-13", "r", "unrated", "nsfw", ""
DEFAULT_NUM_GIFS=<number of gifs to show allow on screen at once. ex. 10>
DEFAULT_GIF_DISPLAY_TIME=<number of seconds to show a gif for. ex. 10>
```

and then run `npm install` and `node bot.js` and everything will start running

Add a new Browser Source overlay on your stream and point it to http://localhost:3000 and the gifs will show up on stream

### Bot commands
Commands are sent to the bot through twitch chat.

The bot turns any line of text in chat into a gif by passing the line as a search to giphy and grabbing a random result

Commands (only useable by channel owner):
- ```!commandMode```: when active the bot will only read lines starting with !gif and use the text following that to search
- ```!edgeMode```: forces all gifs to the edge of the screen
- ```!gifRating <rating>```: sets the rating for gifs
- ```!numGifs <number>```: sets the number of gifs that can be displayed at once before old ones are removed
- ```!gifTimeout <number>```: sets the time in seconds it takes to remove old gifs -- note that due to the 5 second refresh delay this won't be perfect
- ```!noOverlapMode```: prevent preceeding gifs from overlapping (currently only works with 2 gifs at a time.)
- ```!oneAtATimeMode```: only show 1 gif on screen at a time, with additional gifs awaiting their turn in a queue.
- ```!fullscreenMode```: fill the entire gif container with the gif image.

Command (useable by anyone):
- ```!source```: puts a link to the source code in chat

### Future plans:
- Sub only mode?
- Add options to specify the gif page's port
- Allow users to specify gif urls they want to appear (dangerous!)
- Allow users to give coordinates of where they want gif to appear (dangerous?)
- Start the bot in !commandMode
- Eliminate refresh blink
- Have it live update (unsure how besides maybe encoding all gifs into video stream or maybe canvas element, need to investigate)
- reduce overlap of gifs by excluding occupied regions
- give channel owner ability to remove gif
- ban people from using bot
