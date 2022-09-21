const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { });

app.use(express.static("static"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
    console.log("SOCKET CONNECTED");
    if(io.engine.clientsCount === 1){
        socket.emit("new room", { id: socket.id });
    }
    else{
        socket.emit("existing room", { id: socket.id });
        socket.broadcast.emit("joined room", { id: socket.id });
    }
    socket.on("offer", (offer, callback) => {
        console.log("GOT OFFER", offer);
        io.sockets.sockets.get(offer.toId).emit("offer", offer);
        io.sockets.sockets.get(offer.toId).on("answer", (answer) => {
            if(answer.toId === socket.id){
                callback(answer);
            }
        });
    });

    socket.on("candidate", candidate => {
        console.log("CAN", candidate);
        io.sockets.sockets.get(candidate.toId).emit("candidate", candidate);
    });

    socket.on("disconnect", () => {
        socket.broadcast.emit("left room", { id: socket.id });
    })
});

httpServer.listen(process.env.PORT || 3000);