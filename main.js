var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
//var crypto = require('crypto');

/** CONFIG */
var PORT = 80;


/** Global variables*/
var TXTUSERS = [];

app.use(express.static('public'));

var nusersnamespace = io.of('/nusers');
nusersnamespace.on('connection', function (socket) {
    socket.emit("nusers", {nusers: getTotalUsers()});
});

io.of('/txt').on('connection', function (socket) {

    var clientIP = socket.request.connection.remoteAddress;
    //var clientID = crypto.createHash('md5').update(clientIP).digest("hex");
    
    if (TXTUSERS.indexOf(socket) === -1){
        TXTUSERS.push(socket);
    }

    console.log(TXTUSERS);


    console.log(clientIP + " se ha conectado y ahora tendrá el ID: ");

    //socket.emit("connected", {nusers: getTotalUsers()});
    nusersnamespace.emit("nusers", {nusers: getTotalUsers()});

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
    return TXTUSERS.length;
}


server.listen(PORT, function () {
    console.log("Servidor iniciado en el puerto " + PORT);
});