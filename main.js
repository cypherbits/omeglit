var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
//var crypto = require('crypto');

/** CONFIG */
var PORT = 80;

/** GLOBAL VARIABLES */

var TXTWAITING = [];

app.use(express.static('public'));

var ioNUsers = io.of('/nusers');
ioNUsers.on('connection', function (socket) {
    socket.emit("nusers", {nusers: getTotalUsers()});
});

var ioTXT = io.of('/txt');
ioTXT.on('connection', function (socket) {

    //var clientIP = socket.request.connection.remoteAddress;
    //var clientID = crypto.createHash('md5').update(clientIP).digest("hex");

    console.log("Cliente con IP: " + socket.id + " se ha conectado. Ahora hay " + getTotalUsers() + ' usuarios conectados.');

    ioNUsers.emit("nusers", {nusers: getTotalUsers()});

    socket.on("findNewStranger", function (data) {
        console.log("finding new stranger for " + socket.id);

        if (TXTWAITING.length === 0) {
            TXTWAITING.push([socket.id, data.description]);
            console.log("hay " + TXTWAITING.length + " usuarios en espera.");
        } else {
            var stranger = TXTWAITING[Math.floor(Math.random() * TXTWAITING.length)];
            while (stranger[0] === socket.id) {
                stranger = TXTWAITING[Math.floor(Math.random() * TXTWAITING.length)];
            }
            
            socket.emit("gotRemoteDescription", {description: stranger[1]});
            ioTXT.sockets[stranger[0]].emit("gotRemoteDescription", {description: data.description});
            
            TXTWAITING.splice(TXTWAITING.indexOf(stranger));
            
            console.log("ok");
        }


    });

    socket.on('disconnect', function () {
        TXTWAITING.splice(TXTWAITING.indexOf(socket.id));
        console.log("desconectado " + socket.id + ' ahora hay ' + getTotalUsers() + ' usuarios');
    });
});

function getTotalUsers() {
    return Object.keys(ioTXT.sockets).length;
}


server.listen(PORT, "0.0.0.0", function () {
    console.log("Servidor iniciado en el puerto " + PORT);
});