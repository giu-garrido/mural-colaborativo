const http = require("http");
const { Server } = require("socket.io");
const WebSocket = require("ws");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

const port = Number(process.env.PORT) || 3000;
const httpServer = http.createServer((req, res) => {
  if (req.url?.startsWith("/socket.io/")) return;
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});
const io = new Server(httpServer);

// noServer: o ws só trata o /ws
// ligado direto no httpServer, ele recusava os upgrades de /socket.io/ e quebrava o WebSocket do Socket.IO
const wss = new WebSocket.Server({ noServer: true });
httpServer.on("upgrade", (req, socket, head) => {
  if (req.url !== "/ws") return;
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

// post-its ficam no hash "notes" do Redis: campo = id, valor = JSON da nota
// "sub" é uma segunda conexão, só para o pub/sub entre réplicas
const redis = createClient({ url: process.env.REDIS_URL });
const sub = redis.duplicate();

const boasVindas = {
  id: "boas-vindas",
  text: "oiii! arrasta, edita e apaga à vontade ♡",
  x: 40,
  y: 40,
  color: "#ffb3d9",
};

async function lerNota(id) {
  const json = await redis.hGet("notes", id);
  return json && JSON.parse(json);
}

function salvarNota(note) {
  return redis.hSet("notes", note.id, JSON.stringify(note));
}

io.on("connection", async (socket) => {
  console.log("cliente conectado:", socket.id);
  const notes = await redis.hVals("notes");
  socket.emit("notes:init", notes.map((json) => JSON.parse(json)));

  socket.on("note:create", async (note) => {
    if (!note || typeof note.id !== "string") return;
    await salvarNota(note);
    io.emit("note:create", note);
  });

  socket.on("note:update", async (update) => {
    const note = await lerNota(update?.id);
    if (!note) return;
    const updatedNote = { ...note, ...update };
    await salvarNota(updatedNote);
    io.emit("note:update", updatedNote);
  });

  socket.on("note:move", async (move) => {
    const note = await lerNota(move?.id);
    if (!note) return;
    const movedNote = { ...note, x: move.x, y: move.y };
    await salvarNota(movedNote);
    io.emit("note:move", { id: movedNote.id, x: movedNote.x, y: movedNote.y });
  });

  socket.on("note:delete", async (deletion) => {
    if (!(await redis.hDel("notes", deletion?.id ?? ""))) return;
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

async function iniciar() {
  await Promise.all([redis.connect(), sub.connect()]);
  io.adapter(createAdapter(redis, sub)); // io.emit passa a chegar em todas as réplicas
  await redis.hSetNX("notes", boasVindas.id, JSON.stringify(boasVindas));

  httpServer.listen(port, () => {
    console.log(`Servidor HTTP, Socket.IO e WebSocket ouvindo na porta ${port}`);
  });
}

iniciar();
