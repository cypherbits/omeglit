/*var express = require("express");
//var fs = require('fs');
//var cors = require('cors');
var app = express();

//var options = {
//  key: fs.readFileSync('./privkey.pem'),
//  cert: fs.readFileSync('./cert.pem'),
//  ca: fs.readFileSync('./chain.pem')
//};

//var options = {};

//var server = require("https").Server(options, app);
var server = require("http").Server(app);
var io = require("socket.io")(server);

app.use(express.static('public'));

//app.use(cors()); */
var fs = require('fs');

const expressApp = require("express")();

const https = require("https");

const server = https.createServer({
    key: fs.readFileSync('./privkey.pem'),
    cert: fs.readFileSync('./cert.pem'),
    ca: fs.readFileSync('./chain.pem')
}, expressApp);

const io = require("socket.io")(server);

/** CONFIG */
var PORT = 8080;

/** GLOBAL VARIABLES */

var lonelyClientTxt = {};
var allClientsTxt = {};

var lonelyClientVideo = {};
var allClientsVideo = {};

var lonelyClientTxt18 = {};
var allClientsTxt18 = {};

var lonelyClientVideo18 = {};
var allClientsVideo18 = {};


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
    var ioPath = io.of(url);
    ioPath.on('connection', function (socket) {
        //console.log(socket.id, ' just came to website');
        socket.on('disconnect', function () {
            if (allClients[socket.id]) {
                if (lonely.id == socket.id) {
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
                var datetime = new Date();
                console.error(datetime + ": " + error);
            }

        });

    });
}


server.listen(PORT, "0.0.0.0", function () {
    console.log("Servidor iniciado en el puerto " + PORT);
});