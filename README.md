# fire-tcp-chat
A fun chat project that only needs a telnet/netcat client!

![Example](https://i.imgur.com/HFrOhze.gif)

## Setup
To configure this project, you need a MongoDB database for user authentication. You can host your own or  get one [here](https://www.mongodb.com/cloud/atlas) for free! Add this
to the ```.env``` file, along with your port of choice. Obviously, to access this outside of your network, you'll need to port-forward.

## Use
Use ```nc (ip) (port)``` in a bash terminal to connect to the server. The UI is built for an 80x24 terminal, as there is no way to check terminal size over TCP without 
a client app, which defeats the purpose. 

## Warnings and info
- *This isn't even kind of encrypted*. The password should be something simple and not one that you use for other sites
- You can give admins a red name color by adding ```admin: true``` to their MongoDB document. That, however, is the only thing it does

## Customization
You can set an ASCII image to appear by changing the contents of ```ascii.txt```. 
You can also change the server messages in the ```config.json``` file. It looks like this:
```
{
    "name": "The SheepStudios Server",
    "shortName": "SheepStudios",
    "acronym": "SSN",
    "emoji": "🐑",
    "topBorder": "█-█",
    "bottomBorder": "█"
}
```
