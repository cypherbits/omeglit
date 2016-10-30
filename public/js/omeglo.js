'use strict';

var URLConnection = "192.168.0.197";

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
    var localConnection = new RTCPeerConnection();

    socketControl = io.connect('http://' + URLConnection + '/txt');

    var sendChannel = localConnection.createDataChannel("sendDataChannel");
    localConnection.onicecandidate = iceCallback1;
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;
   // localConnection.ondatachannel = receiveChannelCallback;

    localConnection.createOffer().then(
            gotDescription,
            onCreateSessionDescriptionError
            );

    function onCreateSessionDescriptionError(error) {
        console.error('Failed to create session description: ' + error.toString());
    }


    function gotDescription(desc) {
        localConnection.setLocalDescription(desc);
        console.error('Offer from localConnection \n' + desc.sdp);

        socketControl.emit('findNewStranger', {description: desc});
        
        socketControl.on("gotRemoteDescription", function(data){
            console.dir("desc: "+data.description);
        });
        

        remoteConnection.setRemoteDescription(desc);
        remoteConnection.createAnswer().then(
                gotDescription2,
                onCreateSessionDescriptionError
                );
    }

    function gotDescription2(desc) {
        remoteConnection.setLocalDescription(desc);
        console.error('Answer from remoteConnection \n' + desc.sdp);
        localConnection.setRemoteDescription(desc);
    }

    function iceCallback1(event) {
        console.error('local ice callback');
        if (event.candidate) {
            remoteConnection.addIceCandidate(
                    event.candidate
                    ).then(
                    onAddIceCandidateSuccess,
                    onAddIceCandidateError
                    );
            console.error('Local ICE candidate: \n' + event.candidate.candidate);
        }
    }

    function onSendChannelStateChange() {
        var readyState = sendChannel.readyState;
        console.error('Send channel state is: ' + readyState);
        if (readyState === 'open') {
            dataChannelSend.disabled = false;
            dataChannelSend.focus();
            sendButton.disabled = false;
            closeButton.disabled = false;
        } else {
            dataChannelSend.disabled = true;
            sendButton.disabled = true;
            closeButton.disabled = true;
        }
    }





   

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