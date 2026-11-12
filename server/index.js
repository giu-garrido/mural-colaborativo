const http = require("http");
const { Server } = require("socket.io");
const WebSocket = require("ws");

const port = Number(process.env.PORT) || 3000;
const httpServer = http.createServer((req, res) => {
  if (req.url?.startsWith("/socket.io/")) return;
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});
const io = new Server(httpServer);
const wss = new WebSocket.Server({ server: httpServer, path: "/ws" });

const notes = new Map([
  [
    "boas-vindas",
    {
      id: "boas-vindas",
      text: "oiii! arrasta, edita e apaga à vontade ♡",
      x: 40,
      y: 40,
      color: "#ffb3d9",
    },
  ],
]);

io.on("connection", (socket) => {
  console.log("cliente conectado:", socket.id);
  socket.emit("notes:init", Array.from(notes.values()));

  socket.on("note:create", (note) => {
    if (!note || typeof note.id !== "string") return;
    notes.set(note.id, note);
    io.emit("note:create", note);
  });

  socket.on("note:update", (update) => {
    const note = notes.get(update?.id);
    if (!note) return;
    const updatedNote = { ...note, ...update };
    notes.set(updatedNote.id, updatedNote);
    io.emit("note:update", updatedNote);
  });

  socket.on("note:move", (move) => {
    const note = notes.get(move?.id);
    if (!note) return;
    const movedNote = { ...note, x: move.x, y: move.y };
    notes.set(movedNote.id, movedNote);
    io.emit("note:move", { id: movedNote.id, x: movedNote.x, y: movedNote.y });
  });

  socket.on("note:delete", (deletion) => {
    if (!notes.delete(deletion?.id)) return;
    io.emit("note:delete", { id: deletion.id });
  });

  socket.on("disconnect", () => {
    console.log("cliente desconectado:", socket.id);
  });
});

wss.on("connection", (ws) => {
  console.log("cliente WebSocket conectado");
  ws.on("message", (data) => {
    console.log(data.toString());
    ws.send("Recebido!");
  });
  ws.on("error", (err) => {
    console.error("Erro no cliente WebSocket:", err.message);
  });
});

function broadcast(jsonObject) {
  const message = JSON.stringify(jsonObject);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

setInterval(() => {
  broadcast({ time: new Date() });
}, 5000);

httpServer.listen(port, () => {
  console.log(`Servidor HTTP, Socket.IO e WebSocket ouvindo na porta ${port}`);
});
