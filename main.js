var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
var crypto = require('crypto');

/** CONFIG */
var PORT = 80;


app.use(express.static('public'));

io.on('connection', function (socket) {
    
    var clientIP = socket.request.connection.remoteAddress;
    var clientID = crypto.createHash('md5').update(clientIP).digest("hex");
    
    console.log(clientIP + " se ha conectado y ahora tendrá el ID: " + clientID);
    
//  socket.emit('news', { hello: 'world' });
//  socket.on('my other event', function (data) {
//    console.log(data);
//  });
});

server.listen(PORT, function(){
   console.log("Servidor iniciado en el puerto " + PORT); 
});