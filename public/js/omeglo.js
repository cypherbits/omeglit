'use strict';

let pageTitle;
const newMessageText = "(Unread) ";

let URLConnection = "omeglit.com:8080";
let URLProtocol = "https://";

if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    URLConnection = "localhost:8080";
    URLProtocol = "http://";
}

let socketNUsers = null;
let socketControl = null;
let localStream = null;

let isText = false;
let isVideo = false;
let is18 = false;

const iceServers = {
    'iceServers': [
        {
            'urls': 'stun:stun.l.google.com:19302'
        },
        {
            'urls': 'stun:stun.services.mozilla.com:3478'
        }
    ]
};

$(document).ready(function () {

    pageTitle = document.title;

    socketNUsers = io.connect(URLProtocol + URLConnection);
    socketNUsers.on("nusers", function (data) {
        $("#txtNUsers").html(data.nusers);
        $("#txtTextUsers").html(data.txtUsers);
        $("#txtVideoUsers").html(data.videoUsers);
        $("#txtText18Users").html(data.txt18Users);
        $("#txtVideo18Users").html(data.video18Users);

        $("#btnCleanText").prop("disabled", false);
        $("#btnCleanVideo").prop("disabled", false);
    });

    $("#btnCleanText").on("click", function () {
        $("#pageContainer").load("text.html", function () {
            isText = true;
            isVideo = false;
            is18 = false;
            prepareChat();
        });
    });

    $("#btnNomoText").on("click", function () {
        $("#pageContainer").load("text.html", function () {
            isText = true;
            isVideo = false;
            is18 = true;
            prepareChat();
        });
    });

    $("#btnCleanVideo").on("click", function () {
        $("#pageContainer").load("video.html", function () {
            isText = false;
            isVideo = true;
            is18 = false;
            prepareCamera();
        });
    });


    $("#btnNomoVideo").on("click", function () {
        $("#pageContainer").load("video.html", function () {
            isText = false;
            isVideo = true;
            is18 = true;
            prepareCamera();
        });
    });

    $("#check18y").change(function() {
        if (this.checked) {
            console.log("checked");
            $("#btnNomoText").prop("disabled",false);
            $("#btnNomoVideo").prop("disabled",false);
        } else {
            $("#btnNomoText").prop("disabled",true);
            $("#btnNomoVideo").prop("disabled",true);
        }
    });

    $(window).focus(function () {
        document.title = pageTitle;
    });

});


const chatLog = {
    clear: function () {
        $("#txtChatLog").html("");
    },
    addSystemMessage: function (data) {
        $("#txtChatLog").append('<div class="item">' + data + '</div>');
        updateScroll();
    },
    addStrangerMessage: function (data) {
        const encodedStr = data.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
        $("#txtChatLog").append('<div class="item"><span class="stranger">Stranger: </span><span class="msg">' + encodedStr + '</span></div>');
        updateScroll();
    },
    addMeMessage: function (data) {
        const encodedStr = data.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
            return '&#' + i.charCodeAt(0) + ';';
        });
        $("#txtChatLog").append('<div class="item"><span class="you">You: </span><span class="msg">' + encodedStr + '</span></div>');
        updateScroll();
    }
};

function prepareChat() {

    if (isBreakpoint("xs")){
        $("#btnNewChat").css("max-width", "5rem");
        $("#btnSendMessage").css("max-width", "5rem");
    }

    //    var videoTracks = localStream.getVideoTracks();
//    var audioTracks = localStream.getAudioTracks();
//    if (videoTracks.length > 0) {
//        trace('Using video device: ' + videoTracks[0].label);
//    }
//    if (audioTracks.length > 0) {
//        trace('Using audio device: ' + audioTracks[0].label);
//    }

    if (is18) {
        $("#btnNewChat").removeClass("btn-primary").addClass("btn-danger");
        $("#btnSendMessage").removeClass("btn-primary").addClass("btn-danger");
    }

    $("#btnNewChat").prop("disabled", true);
    $("#btnSendMessage").prop("disabled", true);

    $('#txtNewMessage').unbind().keypress(function (event) {
        const keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode === 13) {
            $('#btnSendMessage').click();
            return false;
        }
    });

    chatLog.clear();
    chatLog.addSystemMessage("Looking for a partner...");

    let localConnection = new RTCPeerConnection(iceServers);

    localConnection.onicecandidate = onICECandidate;
    localConnection.ondatachannel = receiveChannelCallback;
    if (isVideo) {
        localConnection.onaddstream = receiveStreamCallback;
    }

    let sendChannel = null;

    if (is18) {
        if (isVideo) {
            socketControl = io.connect(URLProtocol + URLConnection + '/video18');
        } else {
            socketControl = io.connect(URLProtocol + URLConnection + '/txt18');
        }
    } else {
        if (isVideo) {
            socketControl = io.connect(URLProtocol + URLConnection + '/video');
        } else {
            socketControl = io.connect(URLProtocol + URLConnection + '/txt');
        }
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

            let options = {};
            if (isVideo) {
                localConnection.addStream(localStream);
                options = {
                    audio: true,
                    video: true
                };
            }

            localConnection.createOffer(options).then(
                gotDescription,
                onCreateSessionDescriptionError
            );

        }

        enableDisconnect();

    });

    socketControl.on("aborted", function (data) {
        disconnect();
    });

    socketControl.on("disconnect", function (data) {
        disconnect();
    });

    socketControl.on("newMessage", function (data) {
        switch (data.type) {
            case "new-offer":
                if (isVideo) {
                    localConnection.addStream(localStream);
                }
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

    function enableDisconnect(){
        $("#btnNewChat").html("Disconnect");
        $("#btnNewChat").unbind().on("click", function () {
            chatLog.addSystemMessage("You have disconnected.");
            disconnect();
        });
        $("#btnNewChat").prop("disabled", false);
    }

    function receiveStreamCallback(e) {
        //remoteVideo.srcObject = e.stream;
        //$('#remoteVideo').prop('src', URL.createObjectURL(e.stream));
        const remoteVideo = document.querySelector('#remoteVideo');
        remoteVideo.srcObject = e.stream;

        //console.log("remote video stream add");

        resizeVideos();
    }

    function receiveChannelCallback(event) {
        console.log("channel received");

        if (sendChannel === null || (sendChannel.readyState !== 'open')){
            console.log("channel received and set");

            sendChannel = event.channel;

            sendChannel.onopen = onSendChannelStateChange;
            sendChannel.onclose = onSendChannelStateChange;
            //Chrome workaround
            sendChannel.onclosing = onSendChannelStateChange;
            sendChannel.onmessage = handleReceiveMessage;
        }else{
            console.log("channel received NOT set because there is an existing one and in progress");

        }

    }

    function handleReceiveMessage(event) {
        //console.log("new MESSAGE: " + event.data);
        chatLog.addStrangerMessage(event.data);
        if (!document.hasFocus()) {
            document.title = newMessageText + pageTitle;
        }
    }

    function onICECandidate(ice) {
        if (ice.candidate !== null){
            console.dir("sending new ICE candidate: " + ice.candidate);
            socketControl.emit('newMessage', {
                type: 'new-ice',
                msg: JSON.stringify(ice.candidate)
            });
        };
    }

    function onCreateSessionDescriptionError(error) {
        console.error('Failed to create session description: ' + error.toString());
        disconnect();
    }

    function onCreateAnswerError(error) {
        console.error('Failed to create session answer: ' + error.toString());
        disconnect();
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
        const readyState = sendChannel.readyState;
        console.log('Send channel state is: ' + readyState);
        if (readyState === 'open') {
            //Enable send buttons
            chatLog.clear();
            chatLog.addSystemMessage("You're now chatting with a random stranger. Say hi!");

            $("#btnSendMessage").prop("disabled", false);
            $("#txtNewMessage").prop("disabled", false);
        } else if (readyState !== 'connecting') {
            //Disable send buttons
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
        const msg = $("#txtNewMessage").val();

        if (msg.trim() !== "") {
            sendChannel.send(msg.trim());

            $("#txtNewMessage").val("");

            chatLog.addMeMessage(msg);
        }

    }

    function disconnect() {

        if (isVideo) {
            const remoteVideo = document.querySelector('#remoteVideo');
            remoteVideo.src = null;
            remoteVideo.load();
        }

        if (sendChannel !== null){
            sendChannel.close();
        }

        if (localConnection !== null){
            localConnection.close();
        }

        sendChannel = null;
        localConnection = null;

        socketControl.close();

        $("#btnNewChat").html("New chat");
        $("#btnNewChat").unbind().on("click", function () {
            prepareChat(false);
        });
        $("#btnSendMessage").prop("disabled", true);
        $("#txtNewMessage").prop("disabled", true);
    }

}


function prepareCamera() {

    $(window).resize(function () {
        resizeCamera();
    });

    function resizeCamera() {
        if (isBreakpoint("xs")) {
            $("#divOrigVideo2").addClass("mobile");
            $("#leftColumn").addClass("mobile");
            $("#txtChatLog").addClass("mobile");
        } else {
            $("#divOrigVideo2").removeClass("mobile");
            $("#leftColumn").removeClass("mobile");
            $("#txtChatLog").removeClass("mobile");
        }
    }

    resizeCamera();

    chatLog.clear();
    chatLog.addSystemMessage("Enable access to your webcam");

    // Get audio/video stream
    navigator.getUserMedia({audio: true, video: true}, function (stream) {
        // Set your video displays

        //$('#localVideo').prop('src', window.URL.createObjectURL(stream));
        const localVideo = document.querySelector('#localVideo');
        localVideo.srcObject = stream;

        localStream = stream;

        prepareChat();

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
        const now = (window.performance.now() / 1000).toFixed(3);
        console.log(now + ': ' + text);
    } else {
        console.log(text);
    }

}

function updateScroll() {
    const element = document.getElementById("txtChatLog");
    element.scrollTop = element.scrollHeight;
}

function isBreakpoint(alias) {
    return $('.device-' + alias).is(':visible');
}

$(window).resize(function () {
    if (isVideo) {
        resizeVideos();
    }
    if (isVideo || isText) {
        updateScroll();
    }
});

function resizeVideos() {
    if (!isBreakpoint("xs") && ($("#remoteVideo").width() * 2) > ($("#leftColumn").height() / 2) ) {
        $("#remoteVideo").height($("#leftColumn").height() / 2);
        $("#localVideo").height($("#leftColumn").height() / 2);
    } else {
        $("#remoteVideo").height($("#leftColumn").height());
        $("#localVideo").height($("#localVideo").width());
    }
}