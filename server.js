
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    application: "Audio Quest",
    service: "Signaling Server",
    status: "online",
    version: "1.0.0"
  });
});

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  socket.on("join-room", (data = {}) => {
    const { room, role } = data;

    if (
      typeof room !== "string" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(room) ||
      !["reporter", "receiver"].includes(role)
    ) {
      socket.emit("server-error", "Dados de entrada inválidos");
      return;
    }

    for (const joinedRoom of socket.rooms) {
      if (joinedRoom !== socket.id) {
        socket.leave(joinedRoom);
      }
    }

    socket.data.room = room;
    socket.data.role = role;

    socket.join(room);

    socket.to(room).emit("peer-joined", {
      peerId: socket.id,
      role
    });

    
const existingPeers = [];

for (const peerId of io.sockets.adapter.rooms.get(room) || []) {
  if (peerId === socket.id) continue;

  const peer = io.sockets.sockets.get(peerId);

  if (peer) {
    existingPeers.push({
      peerId: peer.id,
      role: peer.data.role
    });
  }
}

socket.emit("room-joined", {
  room,
  peerId: socket.id,
  role,
  peers: existingPeers
});


    console.log(`${role} entrou na sala ${room}`);
  });

  socket.on("signal", (data = {}) => {
    const { target, payload } = data;

    if (
      typeof target !== "string" ||
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return;
    }

    const room = socket.data.room;

    if (!room) return;

    const recipient = io.sockets.sockets.get(target);

    if (
      !recipient ||
      recipient.data.room !== room ||
      recipient.id === socket.id
    ) {
      return;
    }

    io.to(target).emit("signal", {
      from: socket.id,
      payload
    });
  });

  socket.on("disconnecting", () => {
    const room = socket.data.room;

    if (room) {
      socket.to(room).emit("peer-left", {
        peerId: socket.id
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Desconectado:", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Audio Quest Server iniciado na porta ${PORT}`);
});
