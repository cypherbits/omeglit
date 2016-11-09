var express = require("express");
//var fs = require('fs');
var app = express();

//var options = {
//  key: fs.readFileSync('./file.pem'),
//  cert: fs.readFileSync('./file.crt')
//};

//var options = {};

//var server = require("https").Server(options, app);
var server = require("http").Server(app);
var io = require("socket.io")(server);

app.use(express.static('public'));

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

var ioTXT = io.of('/txt');
ioTXT.on('connection', function (socket) {

    console.log(socket.id, ' just came to website');

    socket.on('disconnect', function () {
        if (allClientsTxt[socket.id]) {
            if (lonelyClientTxt.id == socket.id) {
                lonelyClientTxt = {};
            }
            if (allClientsTxt[allClientsTxt[socket.id].partner]) {
                io.to(allClientsTxt[socket.id].partner).emit('aborted');
            }

            delete allClientsTxt[socket.id];

            emitUserCount();

            console.log(socket.id, ' disconnected!');
            console.log(countAllUsers() + ' users online');
        } else {
            console.log('A user that never registered left');
        }

    });

    socket.on('delete', function () {
        if (allClientsTxt[socket.id]) {
            if (lonelyClientTxt.id == socket.id) {
                lonelyClientTxt = {};
            }
            if (allClientsTxt[allClientsTxt[socket.id].partner]) {
                io.to(allClientsTxt[socket.id].partner).emit('aborted');
            }
            delete allClientsTxt[socket.id];

            emitUserCount();

            console.log(socket.id, ' disconnected!');
            console.log(countAllUsers() + ' users online');
        } else {
            console.log('A user that never registered left');
        }
    });

    socket.on('newUser', function () {

        allClientsTxt[socket.id] = socket;

        console.log('New user looking for a partner: ', socket.id);

        if (lonelyClientTxt.id) {
            console.log(lonelyClientTxt.id, ' emparejado con ', socket.id);
            socket.partner = lonelyClientTxt.id;
            allClientsTxt[lonelyClientTxt.id].partner = socket.id;
            allClientsTxt[socket.id].partner = lonelyClientTxt.id;

//            io.to(lonelyClientTxt.id).emit('match', {
//                id: socket.id
//            });
//            io.to(socket.id).emit('match', {
//                id: lonelyClientTxt.id
//            });

            allClientsTxt[socket.id].emit('match', {
                id: lonelyClientTxt.id,
                itsok: true
            });

            allClientsTxt[lonelyClientTxt.id].emit('match', {
                id: socket.id
            });

            lonelyClientTxt = {};

        } else {
            console.log(socket.id, ' busca partner.');
            lonelyClientTxt.id = socket.id;
        }

        console.log(countAllUsers() + ' users online')
        emitUserCount();

    });


    socket.on('newMessage', function (data) {

        console.log(data);

        if (allClientsTxt[socket.id].partner) {

            allClientsTxt[allClientsTxt[socket.id].partner].emit('newMessage', data);

        } else {
            io.to(socket.id).emit('aborted');
        }
    });

});

var ioVIDEO = io.of('/video');
ioVIDEO.on('connection', function (socket) {

    console.log(socket.id, ' just came to website');

    socket.on('disconnect', function () {
        if (allClientsVideo[socket.id]) {
            if (lonelyClientVideo.id == socket.id) {
                lonelyClientVideo = {};
            }
            if (allClientsVideo[allClientsVideo[socket.id].partner]) {
                io.to(allClientsVideo[socket.id].partner).emit('aborted');
            }

            delete allClientsVideo[socket.id];

            emitUserCount();

            console.log(socket.id, ' disconnected!');
            console.log(countAllUsers() + ' users online');
        } else {
            console.log('A user that never registered left');
        }

    });

    socket.on('delete', function () {
        if (allClientsVideo[socket.id]) {
            if (lonelyClientVideo.id == socket.id) {
                lonelyClientVideo = {};
            }
            if (allClientsVideo[allClientsVideo[socket.id].partner]) {
                io.to(allClientsVideo[socket.id].partner).emit('aborted');
            }
            delete allClientsVideo[socket.id];

            emitUserCount();

            console.log(socket.id, ' disconnected!');
            console.log(countAllUsers() + ' users online');
        } else {
            console.log('A user that never registered left');
        }
    });

    socket.on('newUser', function () {

        allClientsVideo[socket.id] = socket;

        console.log('New user looking for a partner: ', socket.id);

        if (lonelyClientVideo.id) {
            console.log(lonelyClientVideo.id, ' emparejado con ', socket.id);
            socket.partner = lonelyClientVideo.id;
            allClientsVideo[lonelyClientVideo.id].partner = socket.id;
            allClientsVideo[socket.id].partner = lonelyClientVideo.id;

//            io.to(lonelyClientTxt.id).emit('match', {
//                id: socket.id
//            });
//            io.to(socket.id).emit('match', {
//                id: lonelyClientTxt.id
//            });

            allClientsVideo[socket.id].emit('match', {
                id: lonelyClientVideo.id,
                itsok: true
            });

            allClientsVideo[lonelyClientVideo.id].emit('match', {
                id: socket.id
            });

            lonelyClientVideo = {};

        } else {
            console.log(socket.id, ' busca partner.');
            lonelyClientVideo.id = socket.id;
        }

        console.log(countAllUsers() + ' users online')
        emitUserCount();

    });


    socket.on('newMessage', function (data) {

        console.log(data);

        if (allClientsVideo[socket.id].partner) {

            allClientsVideo[allClientsVideo[socket.id].partner].emit('newMessage', data);

        } else {
            io.to(socket.id).emit('aborted');
        }
    });

});


server.listen(PORT, "0.0.0.0", function () {
    console.log("Servidor iniciado en el puerto " + PORT);
});