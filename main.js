/** CONFIG AND SERVER SETUP */
const SERVER_PORT = 8080;
const FS_PRIVATE_KEY = "./secrets/privkey.pem";
const FS_CERTIFICATE = "./secrets/cert.pem";
const FS_CACHAIN = "./secrets/chain.pem";

const args = process.argv.slice(2);
console.debug('app arguments: ', args);

const express = require("express");
const expressApp = express();
let server;

if (args.includes("--help")) {
    const txtHelp = " == Omeglit v2 server == \n" +
        " node main.js [--help] [--with-http] [--localhost]\n" +
        "Command options:\n" +
        " --help Display this help \n" +
        " --with-http Serve http public folder too\n" +
        " --localhost Localhost mode (no SSL)";
    console.info(txtHelp);
    process.exit(0);
}

if (args.includes("--with-http")) {
    expressApp.use(express.static('public'));
    console.info("Running as a public HTTP server on port " + SERVER_PORT);
}

if (args.includes("--localhost")) {
    server = require("http").Server(expressApp);
    console.info("Running as a localhost configuration, no SSL");
} else {
    const fs = require('fs');
    if (fs.existsSync(FS_PRIVATE_KEY) && fs.existsSync(FS_CERTIFICATE) && fs.existsSync(FS_CACHAIN)) {
        const https = require("https");
        server = https.createServer({
            key: fs.readFileSync(FS_PRIVATE_KEY),
            cert: fs.readFileSync(FS_CERTIFICATE),
            ca: fs.readFileSync(FS_CACHAIN)
        }, expressApp);
        console.info("Running as a remote server configuration");
    } else {
        console.error("Fatal error: check if SSL certificates files exists (" + FS_PRIVATE_KEY + ", " + FS_CERTIFICATE + ", " + FS_CACHAIN + ")");
        process.exit(1);
    }
}

const io = require("socket.io")(server,
    {
        cors: {
            origin: ["https://omeglit.com", "https://www.omeglit.com"],
            methods: ["GET", "POST"]
        }
    });

/** GLOBAL CHAT VARIABLES */

let lonelyClientTxt = {};
let allClientsTxt = {};

let lonelyClientVideo = {};
let allClientsVideo = {};

let lonelyClientTxt18 = {};
let allClientsTxt18 = {};

let lonelyClientVideo18 = {};
let allClientsVideo18 = {};


function countAllUsers() {
    return Object.keys(allClientsTxt).length + Object.keys(allClientsVideo).length + Object.keys(allClientsTxt18).length + Object.keys(allClientsVideo18).length;
}

function emitUserCount() {
    io.emit("nusers", {nusers: countAllUsers(), txtUsers: Object.keys(allClientsTxt).length, txt18Users: Object.keys(allClientsTxt18).length, videoUsers: Object.keys(allClientsVideo).length, video18Users: Object.keys(allClientsVideo18).length});
}

io.on('connection', function (socket) {
    emitUserCount();
});

newOmeglit("/txt", lonelyClientTxt, allClientsTxt);
newOmeglit("/video", lonelyClientVideo, allClientsVideo);
newOmeglit("/txt18", lonelyClientTxt18, allClientsTxt18);
newOmeglit("/video18", lonelyClientVideo18, allClientsVideo18);


function newOmeglit(url, lonely, allClients) {
    const ioPath = io.of(url);
    ioPath.on('connection', function (socket) {
        //console.log(socket.id, ' just came to website');
        socket.on('disconnect', function () {
            if (allClients[socket.id]) {
                if (lonely.id === socket.id) {
                    lonely = {};
                }
                if (allClients[allClients[socket.id].partner]) {
                    //io.to(allClients[socket.id].partner).emit('disconnect');
                }

                delete allClients[socket.id];

                emitUserCount();

                //console.log(socket.id, ' disconnected!');
                //console.log(countAllUsers() + ' users online');
            } else {
                console.log('A user that never registered left');
            }

        });

        socket.on('newUser', function () {

            allClients[socket.id] = socket;

            //console.log('New user looking for a partner: ', socket.id);

            if (lonely.id) {
                //console.log(lonely.id, ' emparejado con ', socket.id);
                socket.partner = lonely.id;
                allClients[lonely.id].partner = socket.id;
                allClients[socket.id].partner = lonely.id;

                allClients[socket.id].emit('match', {
                    id: lonely.id,
                    itsok: true
                });

                allClients[lonely.id].emit('match', {
                    id: socket.id
                });

                lonely = {};

            } else {
                //console.log(socket.id, ' busca partner.');
                lonely.id = socket.id;
            }

            //console.log(countAllUsers() + ' users online')
            emitUserCount();

        });


        socket.on('newMessage', function (data) {
            // console.log(data);

            try {

                if (allClients[socket.id] !== undefined && allClients[socket.id].partner) {

                    if (allClients[allClients[socket.id].partner] !== undefined) {
                        allClients[allClients[socket.id].partner].emit('newMessage', data);
                    }

                } else {
                    io.to(socket.id).emit('aborted');
                }

            } catch (error) {
                const datetime = new Date();
                console.error(datetime + ": " + error);
            }

        });

    });
}


server.listen(SERVER_PORT, "0.0.0.0", function () {
    console.log("Server started on port " + SERVER_PORT);
});