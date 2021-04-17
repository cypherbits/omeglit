const args = process.argv.slice(2);
console.log('app arguments: ', args);

let server;
if (args.length !== 0 && args[0] === "--localhost"){
    console.log("using localhost configuration");
    const express = require("express");
    const app = express();
    app.use(express.static('public'));
    server = require("http").Server(app);
}else{
    const fs = require('fs');
    const expressApp = require("express")();
    const https = require("https");
    server = https.createServer({
        key: fs.readFileSync('./privkey.pem'),
        cert: fs.readFileSync('./cert.pem'),
        ca: fs.readFileSync('./chain.pem')
    }, expressApp);
}


const io = require("socket.io")(server);

/** CONFIG */
const PORT = 8080;

/** GLOBAL VARIABLES */

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
    io.emit("nusers", {nusers: countAllUsers()});
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

                    if (allClients[allClients[socket.id].partner] !== undefined){
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


server.listen(PORT, "0.0.0.0", function () {
    console.log("Server started on port " + PORT);
});