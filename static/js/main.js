(async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    const videoEle = document.createElement("video");
    videoEle.setAttribute("autoplay", true);
    videoEle.muted = true;
    videoEle.srcObject = mediaStream;
    document.getElementById("conf").appendChild(videoEle);

    const socket = io({
        transports: ["websocket"]
    });
    let peerConnections = window.peers = {};
    socket.on('new room', ({ id }) => {
        console.log("JOINED NEW ROOM");
    });
    socket.on('existing room', ({ id }) => {
        console.log("JOINED EXISTING ROOM");
    });
    socket.on('joined room', async ({ id }) => {
        console.log(`${id} joined room`);
        const peerConnection = peerConnections[id] = new RTCPeerConnection({
            iceServers:[{"urls":"stun:stun.l.google.com:19302"}]
        });
        peerConnection.onicecandidate = event => {
            if(event.candidate){
                const candidate = event.candidate;
                socket.emit("candidate", {toId: id, fromId: socket.id, candidate});
            }
        };
        peerConnection.onaddstream = event => {
            const videoEle = document.createElement("video");
            videoEle.setAttribute("autoplay", true);
            videoEle.setAttribute("id", id);
            videoEle.muted = true;
            videoEle.srcObject = event.stream;
            document.getElementById("conf").appendChild(videoEle);
        };
        peerConnection.onremovestream = () => {

        };
        peerConnection.addStream(mediaStream);
        const offer = await peerConnection.createOffer();
        const { type, sdp } = offer;
        peerConnection.setLocalDescription(offer);
        socket.emit("offer", { fromId: socket.id, toId: id, type, sdp }, answer => {
            console.log("GOT ANSWER", answer);
            peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        });
    });

    socket.on("offer", async offer => {
        console.log("GOT OFFER", offer);
        const peerConnection = peerConnections[offer.fromId] = new RTCPeerConnection({
            iceServers:[{"urls":"stun:stun.l.google.com:19302"}]
        });
        peerConnection.onicecandidate = event => {
            if(event.candidate){
                const candidate = event.candidate;
                socket.emit("candidate", {toId: offer.fromId, fromId: socket.id, candidate});
            }
        };
        peerConnection.onaddstream = event => {
            const videoEle = document.createElement("video");
            videoEle.setAttribute("autoplay", true);
            videoEle.muted = true;
            videoEle.srcObject = event.stream;
            videoEle.setAttribute("id", offer.fromId);
            document.getElementById("conf").appendChild(videoEle);
        };
        peerConnection.onremovestream = () => {

        };
        peerConnection.addStream(mediaStream);
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        const { type, sdp } = answer;
        peerConnection.setLocalDescription(answer);
        socket.emit("answer", { fromId: socket.id, toId: offer.fromId, type, sdp });
    });

    socket.on("candidate", event => {
        peerConnections[event.fromId].addIceCandidate(new RTCIceCandidate(event.candidate));
    })

    socket.on("left room", ({ id }) => {
        document.getElementById(id).remove();
        peerConnections[id].close();
    })

})();