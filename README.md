### Code of omeglit.com v2

This is a Omegle clone experiment from when Omegle still worked with Flash Player.

Updated and tested with Node 10.19

Version 2.0 vs 1.0:
- Socket.io client and server updated from 2.4 to 4.0.2
- Updated client adapter.js to v8.
- Updated Bootstrap from 3.x to 4.6. And redesig.
- Updated jQuery to 3.6.
- Refactor and removed duplicated code of omeglo.js (main client functional js).
- New features and fixes: new message notification in title + set remote video to black when disconnected + mute your microphone.

### How to run

1. Change the file ./js/omeglo.js _URLConnection and URLProtocol_ variables to set your server websocket (localhost:8080 and http:// if you run on localhost).
2. If you run on a server, you need https for this to work. You need to copy your domain certificates to main folder as omeglo needs to read the Certificate Chain (CA), Certificate, and Private Key. I did this with Let's Encrypt certbot.
3. Start the app with `node main.js [--localhost]`.

### Command line --help

**== Omeglit v2 server ==**

`node main.js [--help] [--with-http] [--localhost]`

Command line server start options:

`--help` Display this help

`--with-public-server` Serve http public folder too

`--localhost` Localhost mode (no SSL)


### Licenced under
**Creative Commons 4.0 Attribution-NonCommercial-ShareAlike 4.0 International**

Legal text: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode