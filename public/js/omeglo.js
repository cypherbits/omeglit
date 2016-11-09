'use strict';

var URLConnection = "127.0.0.1:8080";

var socketNUsers = null;
var socketControl = null;

$(document).ready(function () {

    socketNUsers = io.connect("http://" + URLConnection);
    socketNUsers.on("nusers", function (data) {
        $("#txtNUsers").html(data.nusers);
        console.log(data.nusers);
    });

    $("#btnCleanText").on("click", function () {
        $("#pageContainer").load("text.html", function () {
            prepareTextChat();
        });
    });

    $("#btnCleanVideoAAA").on("click", function () {
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


function prepareTextChat(is18) {
    chatLog.clear();
    chatLog.addSystemMessage("Looking for a partner...");

    var localConnection = new RTCPeerConnection();

    localConnection.onicecandidate = onICECandidate;
    localConnection.ondatachannel = receiveChannelCallback;

    var sendChannel = null;

    if (is18) {
        socketControl = io.connect('http://' + URLConnection + '/txt18');
    } else {
        socketControl = io.connect('http://' + URLConnection + '/txt');
    }


    socketControl.emit('newUser', {});

    socketControl.on("match", function (data) {
        console.log("creating offer");
        chatLog.addSystemMessage("Partner found, trying to connect...");

        if (data.itsok) {
            sendChannel = localConnection.createDataChannel("sendChannel");
            sendChannel.onopen = onSendChannelStateChange;
            sendChannel.onclose = onSendChannelStateChange;
            sendChannel.onmessage = handleReceiveMessage;

            localConnection.createOffer().then(
                    gotDescription,
                    onCreateSessionDescriptionError
                    );
        }

    });

    socketControl.on("newMessage", function (data) {
        switch (data.type) {
            case "new-offer":
                localConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.msg)), function () {
                    localConnection.createAnswer().then(
                            gotAnswer,
                            onCreateAnswerError
                            );
                }, function (e) {
                    console.error("ERROR" + e);
                });

                console.debug("we got new remote offer: " + JSON.parse(data.msg));
                break;
            case "new-answer":
                localConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.msg)));
                console.debug("we got new remote answer: " + JSON.parse(data.msg));
                break;
            case "new-ice":
                if (JSON.parse(data.msg) != null) {
                    localConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(data.msg)));
                }

                console.debug("we got new remote ICE candidate: " + JSON.parse(data.msg));
                break;
        }
    });

    function receiveChannelCallback(event) {
        console.log("channel received");

        sendChannel = event.channel;

        sendChannel.onopen = onSendChannelStateChange;
        sendChannel.onclose = onSendChannelStateChange;
        sendChannel.onmessage = handleReceiveMessage;
    }

    function handleReceiveMessage(event) {
        console.log("new MESSAGE: " + event.data);
        chatLog.addStrangerMessage(event.data);
    }

    function onICECandidate(ice) {
        console.dir("sending new ICE candidate: " + ice.candidate);
        socketControl.emit('newMessage', {
            type: 'new-ice',
            msg: JSON.stringify(ice.candidate)
        });
    }

    function onCreateSessionDescriptionError(error) {
        console.error('Failed to create session description: ' + error.toString());
    }

    function onCreateAnswerError(error) {
        console.error('Failed to create session answer: ' + error.toString());
    }

    function gotAnswer(data) {
        console.debug("sending answer: " + data);
        localConnection.setLocalDescription(data);
        socketControl.emit('newMessage', {
            type: 'new-answer',
            msg: JSON.stringify(data)
        });
    }

    function gotDescription(desc) {
        localConnection.setLocalDescription(desc);
        console.debug('sending offer ' + desc.sdp);

        socketControl.emit('newMessage', {
            type: 'new-offer',
            msg: JSON.stringify(desc)
        });
    }

    function onSendChannelStateChange() {
        var readyState = sendChannel.readyState;
        console.error('Send channel state is: ' + readyState);
        if (readyState === 'open') {
            //habilitar botones para enviar
            chatLog.clear();
            chatLog.addSystemMessage("You're now chatting with a random stranger. Say hi!");
        } else {
            //deshabilitar botones para enviar
            console.log("not data channel open");
        }
    }

    $("#btnSendMessage").on("click", function () {
        sendMessage();
    });

    function sendMessage() {
        var msg = $("#txtNewMessage").val();
        sendChannel.send(msg);

        $("#txtNewMessage").val("");

        chatLog.addMeMessage(msg);
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

function trace(text) {
    // This function is used for logging.
    if (text[text.length - 1] === '\n') {
        text = text.substring(0, text.length - 1);
    }
    if (window.performance) {
        var now = (window.performance.now() / 1000).toFixed(3);
        console.log(now + ': ' + text);
    } else {
        console.log(text);
    }

}

var chatLog = {
    clear: function () {
        $("#txtChatLog").html("");
    },
    addSystemMessage: function (data) {
        $("#txtChatLog").append('<div class="item">' + data + '</div>');
    },
    addStrangerMessage: function (data) {
        var encodedStr = data.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
        $("#txtChatLog").append('<div class="item"><span class="stranger">Stranger: </span><span class="msg">' + encodedStr + '</span></div>');
    },
    addMeMessage: function (data) {
         var encodedStr = data.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
        $("#txtChatLog").append('<div class="item"><span class="you">You: </span><span class="msg">' + encodedStr + '</span></div>');
    }
};