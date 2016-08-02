'use strict';

var URLConnection = "192.168.0.199";

var socketNUsers = null;
var socketControl = null;

$(document).ready(function () {

    // Compatibility shim
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    socketNUsers = io.connect("http://" + URLConnection + "/nusers");
    socketNUsers.on("nusers", function (data) {
        $("#txtNUsers").html(data.nusers);
        console.log(data.nusers);
    });



    $("#btnCleanText").on("click", function () {
        $("#pageContainer").load("text.html", function () {
            prepareTextChat();
        });
    });

    $("#btnCleanVideo").on("click", function () {
        $("#pageContainer").load("video.html", function () {

            // Compatibility shim
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// PeerJS object
            var peer = new Peer({key: 'canbethisbetheapikey', debug: 3, host: "vps.avanix.es", port: 8080, secure: true});

            peer.on('open', function () {
                $('#txtChatLog').text(peer.id);
            });

// Receiving a call
            peer.on('call', function (call) {
                // Answer the call automatically (instead of prompting user) for demo purposes
                call.answer(window.localStream);
                step3(call);
            });
            peer.on('error', function (err) {
                alert(err.message);
                // Return to step 2 if error occurs

            });

            peer.on('connection', function (conn) {
                alert(conn);
                console.dir(conn);
                conn.on('open', function () {
                    // Receive messages
                    conn.on('data', function (data) {
                        alert("data1: " + data);
                        console.log('Received ', data);
                    });

                    // Send messages
                    conn.send('Hello!');
                });
            });

            $('#btnNewChat').click(function () {
                // Initiate a call!
                var call = peer.call($('#txtNewMessage').val(), window.localStream);
                var connection = peer.connect($('#txtNewMessage').val());

//                connection.on('open', function () {
//                    // Receive messages
//                    connection.on('data', function (data) {
//                        alert("data2: " + data);
//                        console.log('Received ', data);
//                    });
//
//                    // Send messages
//                    connection.send('Hello!');
//                });

                step3(call, connection);
            });

            $('#btnSendMessage').click(function () {
                window.existingCall.close();

            });

            // Retry if getUserMedia fails
            $('#step1-retry').click(function () {
                $('#step1-error').hide();
                step1();
            });

            prepareCamera();

        });

    });
});


function prepareTextChat() {
//    var localConnection = new RTCPeerConnection();
//
//    sendChannel = localConnection.createDataChannel("sendChannel");
//    sendChannel.onopen = handleSendChannelStatusChange;
//    sendChannel.onclose = handleSendChannelStatusChange;
//    localConnection.ondatachannel = receiveChannelCallback;
//    
//    localConnection.onicecandidate = onIceCandidate;

//    
//    localConnection.createOffer()
//    .then(offer => localConnection.setLocalDescription(offer))
//    .then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
//    .then(() => remoteConnection.createAnswer())
//    .then(answer => remoteConnection.setLocalDescription(answer))
//    .then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
//    .catch(handleCreateDescriptionError);

    //https://developer.mozilla.org/es/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample


    socketControl = io.connect('http://' + URLConnection + '/txt');
    socketControl.emit('findNewStranger');

    socketControl.on("sysMsg", function (data) {
        alert("Warning: " + data.message);
        console.warn("Warning: " + data.message);
    });

    socketControl.on('newstrangerfound', function (data) {
        socketControl.emit('my other event', {my: 'data'});
    });
}


function prepareCamera() {
    // Get audio/video stream
    navigator.getUserMedia({audio: true, video: true}, function (stream) {
        // Set your video displays
        $('#localVideo').prop('src', URL.createObjectURL(stream));

        window.localStream = stream;
    }, function () {
        $('#step1-error').show();
    });
}


function step3(call, connection) {
    // Hang up on an existing call if present
    if (window.existingCall) {
        window.existingCall.close();
    }

    // Wait for stream on the call, then set peer video display
    call.on('stream', function (stream) {
        $('#remoteVideo').prop('src', URL.createObjectURL(stream));
    });



    // UI stuff
    window.existingCall = call;
    $('#their-id').text(call.peer);
    $('#step1, #step2').hide();

}