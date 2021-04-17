### Code of omeglit.com

This is a Omegle clone experiment from when Omegle still worked with Flash Player.

Updated and tested with Node 10.19

### How to run

1. Change the file ./js/omeglo.js _URLConnection and URLProtocol_ variables to set your server websocket (localhost:8080 and http:// if you run on localhost).
2. If you run on a server, you need https for this to work. You need to copy your domain certificates to main folder as omeglo needs to read the Certificate Chain (CA), Certificate, and Private Key. I did this with Let's Encrypt certbot.
3. Start the app with `node main.js [--localhost]`.