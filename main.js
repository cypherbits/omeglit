var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
//var crypto = require('crypto');

/** CONFIG */
var PORT = 80;


/** Global variables*/
var TXTUSERS = [];
var VIDEOUSERS = [];
var TXT18USERS = [];
var VIDEO18USERS = [];

app.use(express.static('public'));

var nusersnamespace = io.of('/nusers');
nusersnamespace.on('connection', function (socket) {
    socket.emit("nusers", {nusers: getTotalUsers()});
});

io.of('/txt').on('connection', function (socket) {

    var clientIP = socket.request.connection.remoteAddress;
    //var clientID = crypto.createHash('md5').update(clientIP).digest("hex");

    if (TXTUSERS.indexOf(socket) === -1) {
        TXTUSERS.push(socket);
    }

    console.log("Cliente con IP: " + clientIP + " se ha conectado. Ahora hay " + getTotalUsers() + ' usuarios conectados.');

    nusersnamespace.emit("nusers", {nusers: getTotalUsers()});

    socket.on("findNewStranger", function () {
        console.log("finding new stranger for " + clientIP);

        var strangerSocket = TXTUSERS[Math.floor(Math.random() * TXTUSERS.length)];
        while (strangerSocket === socket) {
            strangerSocket = TXTUSERS[Math.floor(Math.random() * TXTUSERS.length)];
        }
//
//            console.log("yo: " + socket.id);
//            console.log("stranger: " + strangerSocket.id);

        if (getTotalUsers() < 2) {
            socket.emit("sysMsg", {message: "Less than 2 users connected, wait until more users connect."});
            console.log("warning: less than 2 users");
        }


    });

//  socket.emit('news', { hello: 'world' });
//  socket.on('my other event', function (data) {
//    console.log(data);
//  });

    socket.on('disconnect', function () {
        var i = TXTUSERS.indexOf(socket);
        TXTUSERS.splice(i, 1);

        console.log("desconectado " + clientIP);
    });
});

function getTotalUsers() {
    return TXTUSERS.length + VIDEOUSERS.length + TXT18USERS.length + VIDEO18USERS.length;
}


server.listen(PORT, function () {
    console.log("Servidor iniciado en el puerto " + PORT);
});