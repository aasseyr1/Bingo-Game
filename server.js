
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

function cleanName(value) {
  return String(value || "").trim().slice(0, 40);
}
function cleanRoom(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}
function bingoLines(selected) {
  const s = new Set(selected);
  const lines = [];
  for (let r = 0; r < 5; r++) lines.push([0,1,2,3,4].map(c => r*5+c));
  for (let c = 0; c < 5; c++) lines.push([0,1,2,3,4].map(r => r*5+c));
  lines.push([0,6,12,18,24], [4,8,12,16,20]);
  return lines.filter(line => line.every(i => s.has(i))).length;
}
function roomSnapshot(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  const people = [...room.participants.values()].map(p => ({
    id: p.id,
    name: p.name,
    count: p.selected.size,
    bingoLines: bingoLines([...p.selected]),
    fullHouse: p.selected.size === 25,
    isHost: p.isHost
  }));
  people.sort((a,b) => b.count - a.count || b.bingoLines - a.bingoLines || a.name.localeCompare(b.name));
  return {
    roomCode,
    participantCount: people.length,
    people,
    leader: people[0] || null
  };
}
function broadcast(roomCode) {
  const snap = roomSnapshot(roomCode);
  if (snap) io.to(roomCode).emit("room:update", snap);
}

io.on("connection", socket => {
  socket.on("host:create", ({name}, cb) => {
    const hostName = cleanName(name) || "Host";
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      hostSocketId: socket.id,
      participants: new Map()
    });
    const room = rooms.get(roomCode);
    room.participants.set(socket.id, {
      id: socket.id,
      name: hostName,
      selected: new Set([12]),
      isHost: true
    });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    cb && cb({ok:true, roomCode});
    broadcast(roomCode);
  });

  socket.on("room:join", ({roomCode, name}, cb) => {
    const code = cleanRoom(roomCode);
    const personName = cleanName(name);
    const room = rooms.get(code);
    if (!room) return cb && cb({ok:false, error:"Room not found. Check the code and try again."});
    if (!personName) return cb && cb({ok:false, error:"Please enter your name."});

    const existingNames = [...room.participants.values()].map(p => p.name.toLowerCase());
    let finalName = personName;
    let n = 2;
    while (existingNames.includes(finalName.toLowerCase())) {
      finalName = `${personName} ${n++}`;
    }

    room.participants.set(socket.id, {
      id: socket.id,
      name: finalName,
      selected: new Set([12]),
      isHost: false
    });
    socket.join(code);
    socket.data.roomCode = code;
    cb && cb({ok:true, roomCode: code, name: finalName});
    broadcast(code);
  });

  socket.on("board:toggle", ({index}) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    const p = room?.participants.get(socket.id);
    if (!p) return;
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i > 24 || i === 12) return;
    p.selected.has(i) ? p.selected.delete(i) : p.selected.add(i);
    socket.emit("board:self", {selected:[...p.selected]});
    broadcast(code);
  });

  socket.on("board:reset", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    const p = room?.participants.get(socket.id);
    if (!p) return;
    p.selected = new Set([12]);
    socket.emit("board:self", {selected:[12]});
    broadcast(code);
  });

  socket.on("host:reset-all", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room || room.hostSocketId !== socket.id) return;
    for (const p of room.participants.values()) p.selected = new Set([12]);
    io.to(code).emit("board:reset-all");
    broadcast(code);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    room.participants.delete(socket.id);
    if (room.hostSocketId === socket.id) {
      io.to(code).emit("room:closed");
      rooms.delete(code);
    } else {
      broadcast(code);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Reflection Bingo running on http://localhost:${PORT}`));
