'use strict';

let URLConnection = "omeglit.com";
let URLProtocol = "https://";

if (location.hostname === "localhost" || location.hostname === "127.0.0.1"){
    URLConnection = "localhost:8080";
    URLProtocol = "http://";
}

let socketNUsers = null;
let socketControl = null;
let localStream = null;

let page = null;

const iceServers = {
    'iceServers': [
        {
            'url': 'stun:stun.l.google.com:19302'
        },
        {
            'url': 'stun.services.mozilla.com:3478'
        }
    ]
};

$(document).ready(function () {

    socketNUsers = io.connect(URLProtocol + URLConnection);
    socketNUsers.on("nusers", function (data) {
        $("#txtNUsers").html(data.nusers);
        //console.log(data.nusers);

        $("#btnCleanText").prop("disabled", false);
        $("#btnCleanVideo").prop("disabled", false);
        $("#btnNomoText").prop("disabled", false);
        $("#btnNomoVideo").prop("disabled", false);
    });

    $("#btnCleanText").on("click", function () {
        $("#pageContainer").load("text.html", function () {
            prepareTextChat(false);
        });
    });

    $("#btnNomoText").on("click", function () {
        $("#pageContainer").load("text.html", function () {
            prepareTextChat(true);
        });
    });

    $("#btnCleanVideo").on("click", function () {
        $("#pageContainer").load("video.html", function () {

            prepareCamera(false);
            //prepareVideoChat(false);
        });
    });


    $("#btnNomoVideo").on("click", function () {
        $("#pageContainer").load("video.html", function () {

            prepareCamera(true);
            //prepareVideoChat(true);
        });
    });

    $("#btnHover").on("click", function () {
        $("#divHover").hide();
    });

});


function prepareVideoChat(is18) {

    page = "video";

//    var videoTracks = localStream.getVideoTracks();
//    var audioTracks = localStream.getAudioTracks();
//    if (videoTracks.length > 0) {
//        trace('Using video device: ' + videoTracks[0].label);
//    }
//    if (audioTracks.length > 0) {
//        trace('Using audio device: ' + audioTracks[0].label);
//    }

    $("#btnNewChat").prop("disabled", true);
    $("#btnSendMessage").prop("disabled", true);

    $('#txtNewMessage').unbind().keypress(function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode === 13) {
            $('#btnSendMessage').click();
            return false;
        }
    });

    chatLog.clear();
    chatLog.addSystemMessage("Looking for a partner...");

    var localConnection = new RTCPeerConnection(iceServers);

    localConnection.onicecandidate = onICECandidate;
    localConnection.ondatachannel = receiveChannelCallback;
    localConnection.onaddstream = receiveStreamCallback;

    var sendChannel = null;

    if (is18) {
        socketControl = io.connect(URLProtocol + URLConnection + '/video18');
    } else {
        socketControl = io.connect(URLProtocol + URLConnection + '/video');
    }


    socketControl.emit('newUser', {});

    socketControl.on("match", function (data) {
        console.log("creating offer");
        chatLog.addSystemMessage("Partner found, trying to connect...");

        if (data.itsok) {
            sendChannel = localConnection.createDataChannel("sendChannel");
            sendChannel.onopen = onSendChannelStateChange;
            sendChannel.onclose = onSendChannelStateChange;
            //Chrome workaround
            sendChannel.onclosing = onSendChannelStateChange;
            sendChannel.onmessage = handleReceiveMessage;

            localConnection.addStream(localStream);

            localConnection.createOffer({
                audio: true,
                video: true
            }).then(
                    gotDescription,
                    onCreateSessionDescriptionError
                    );
        }

    });


  /*  socketControl.on("disconnect", function (data) {

        chatLog.addSystemMessage("Stranger have disconnected.");
        disconnect();

    });*/

    socketControl.on("newMessage", function (data) {
        switch (data.type) {
            case "new-offer":

                localConnection.addStream(localStream);

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

    function receiveStreamCallback(e) {
        //remoteVideo.srcObject = e.stream;
        //$('#remoteVideo').prop('src', URL.createObjectURL(e.stream));
        var remoteVideo = document.querySelector('#remoteVideo');
        remoteVideo.srcObject = e.stream;

        //console.log("remote video stream add");

        resizeVideos();
    }

    function receiveChannelCallback(event) {
        console.log("channel received");

        sendChannel = event.channel;

        sendChannel.onopen = onSendChannelStateChange;
        sendChannel.onclose = onSendChannelStateChange;
        //Chrome workaround
        sendChannel.onclosing = onSendChannelStateChange;
        sendChannel.onmessage = handleReceiveMessage;
    }

    function handleReceiveMessage(event) {
        //console.log("new MESSAGE: " + event.data);
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
        console.log('Send channel state is: ' + readyState);
        if (readyState === 'open') {
            //habilitar botones para enviar
            chatLog.clear();
            chatLog.addSystemMessage("You're now chatting with a random stranger. Say hi!");

            $("#btnNewChat").html("Disconnect");
            $("#btnNewChat").unbind().on("click", function () {
                chatLog.addSystemMessage("You have disconnected.");
                disconnect();
            });
            $("#btnNewChat").prop("disabled", false);
            $("#btnSendMessage").prop("disabled", false);
            $("#txtNewMessage").prop("disabled", false);
        } else {
            //deshabilitar botones para enviar
            console.log("not data channel open");
            chatLog.addSystemMessage("Stranger have disconnected.");
            $("#btnNewChat").prop("disabled", false);
            disconnect();

        }
    }

    $("#btnSendMessage").unbind().on("click", function () {
        sendMessage();
    });

    function sendMessage() {
        var msg = $("#txtNewMessage").val();

        if (msg.trim() != "") {
            sendChannel.send(msg.trim());

            $("#txtNewMessage").val("");

            chatLog.addMeMessage(msg);
        }

    }

    function disconnect() {

        sendChannel.close();

        localConnection.close();

        sendChannel = null;
        localConnection = null;

        socketControl.close();

        $("#btnNewChat").html("New chat");
        $("#btnNewChat").unbind().on("click", function () {
            prepareTextChat(false);
        });
        $("#btnSendMessage").prop("disabled", true);
        $("#txtNewMessage").prop("disabled", true);
    }

}


function prepareTextChat(is18) {

    page = "text";

    if (is18) {
        $("#btnNewChat").removeClass("btn-primary").addClass("btn-adult");
        $("#btnSendMessage").removeClass("btn-primary").addClass("btn-adult");
        $("body").addClass("adult-text");
    }

    $("#btnNewChat").prop("disabled", true);
    $("#btnSendMessage").prop("disabled", true);

    $('#txtNewMessage').unbind().keypress(function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == "13") {
            $('#btnSendMessage').click();
            return false;
        }
    });

    chatLog.clear();
    chatLog.addSystemMessage("Looking for a partner...");

    var localConnection = new RTCPeerConnection(iceServers);

    localConnection.onicecandidate = onICECandidate;
    localConnection.ondatachannel = receiveChannelCallback;

    var sendChannel = null;

    if (is18) {
        socketControl = io.connect(URLProtocol + URLConnection + '/txt18');
    } else {
        socketControl = io.connect(URLProtocol + URLConnection + '/txt');
    }


    socketControl.emit('newUser', {});

    socketControl.on("match", function (data) {
        console.log("creating offer");
        chatLog.addSystemMessage("Partner found, trying to connect...");

        if (data.itsok) {
            sendChannel = localConnection.createDataChannel("sendChannel");
            sendChannel.onopen = onSendChannelStateChange;
            sendChannel.onclose = onSendChannelStateChange;
            //Chrome workaround
            sendChannel.onclosing = onSendChannelStateChange;
            sendChannel.onmessage = handleReceiveMessage;

            localConnection.createOffer().then(
                    gotDescription,
                    onCreateSessionDescriptionError
                    );
        }

    });


  /*  socketControl.on("disconnect", function (data) {

        chatLog.addSystemMessage("Stranger have disconnected.");
        disconnect();

    });*/

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
        //Chrome workaround
        sendChannel.onclosing = onSendChannelStateChange;
        sendChannel.onmessage = handleReceiveMessage;
    }

    function handleReceiveMessage(event) {
        //console.log("new MESSAGE: " + event.data);
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
        console.log('Send channel state is: ' + readyState);
        if (readyState === 'open') {
            //habilitar botones para enviar
            chatLog.clear();
            chatLog.addSystemMessage("You're now chatting with a random stranger. Say hi!");

            $("#btnNewChat").html("Disconnect");
            $("#btnNewChat").unbind().on("click", function () {
                chatLog.addSystemMessage("You have disconnected.");
                disconnect();
            });
            $("#btnNewChat").prop("disabled", false);
            $("#btnSendMessage").prop("disabled", false);
            $("#txtNewMessage").prop("disabled", false);
        } else {
            //deshabilitar botones para enviar
            console.log("not data channel open");
            chatLog.addSystemMessage("Stranger have disconnected.");
            $("#btnNewChat").prop("disabled", false);
            disconnect();

        }
    }

    $("#btnSendMessage").unbind().on("click", function () {
        sendMessage();
    });

    function sendMessage() {
        var msg = $("#txtNewMessage").val();

        if (msg.trim() != "") {
            sendChannel.send(msg.trim());

            $("#txtNewMessage").val("");

            chatLog.addMeMessage(msg);
        }

    }

    function disconnect() {

        sendChannel.close();

        localConnection.close();

        sendChannel = null;
        localConnection = null;

        socketControl.close();

        $("#btnNewChat").html("New chat");
        $("#btnNewChat").unbind().on("click", function () {
            prepareTextChat(false);
        });
        $("#btnSendMessage").prop("disabled", true);
        $("#txtNewMessage").prop("disabled", true);
    }

}


function prepareCamera(is18) {

    $(window).resize(function () {
        resizeCamera();
    });

    function resizeCamera() {
        if (isBreakpoint("xs")) {
            $("#divOrigVideo2").addClass("mobile");
            $("#leftColumn").addClass("mobile");
        } else {
            $("#divOrigVideo2").removeClass("mobile");
            $("#leftColumn").removeClass("mobile");
        }
    }

    resizeCamera();

    if (is18) {
        $("#btnNewChat").removeClass("btn-primary").addClass("btn-adult");
        $("#btnSendMessage").removeClass("btn-primary").addClass("btn-adult");
        $("body").addClass("adult-text");
    }

    chatLog.clear();
    chatLog.addSystemMessage("Enable access to your webcam");

    // Get audio/video stream
    navigator.getUserMedia({audio: true, video: true}, function (stream) {
        // Set your video displays

        //$('#localVideo').prop('src', window.URL.createObjectURL(stream));
        var localVideo = document.querySelector('#localVideo');
        localVideo.srcObject = stream;

        localStream = stream;

        prepareVideoChat(is18);

    }, function (error) {
        console.error(error);
        alert("Your webcam is disabled or your browser does not support this feature.");
        window.location = "./";
    });
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
        updateScroll();
    },
    addStrangerMessage: function (data) {
        var encodedStr = data.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
        $("#txtChatLog").append('<div class="item"><span class="stranger">Stranger: </span><span class="msg">' + encodedStr + '</span></div>');
        updateScroll();
    },
    addMeMessage: function (data) {
        var encodedStr = data.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
        $("#txtChatLog").append('<div class="item"><span class="you">You: </span><span class="msg">' + encodedStr + '</span></div>');
        updateScroll();
    }
};

function updateScroll() {
    var element = document.getElementById("txtChatLog");
    element.scrollTop = element.scrollHeight;
}

function isBreakpoint(alias) {
    return $('.device-' + alias).is(':visible');
}

$(window).resize(function () {
    if (page === "video"){
        resizeVideos();
    }
    if (page === "videos" || page === "text"){
        updateScroll();
    }
});

function resizeVideos() {
    if ($("#remoteVideo").width() * 2 > $("#leftColumn").height() && !isBreakpoint("xs")) {
        $("#remoteVideo").height($("#leftColumn").height() / 2);
        $("#localVideo").height($("#leftColumn").height() / 2);
    } else {
        $("#remoteVideo").height($("#remoteVideo").width());
        $("#localVideo").height($("#localVideo").width());
    }

}