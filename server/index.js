/*Fontes usadas:
Como criar um WebSocket Server com Node.js - LuizTools (youtube)
*/
require("dotenv").config({ path: __dirname + "/.env" });
const WebSocket = require("ws");
const port = process.env.PORT; //|| 8080

const wss = new WebSocket.Server({ port });

function broadcast(jsonObject) {
  if (!this.clients) return;
  this.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(jsonObject));
    }
  });
}

function onMessage(ws, data) {
  console.log(data.toString());
  ws.send("Recebido!");
}

function onError(ws, err) {
  console.error("onError");
}

function onConnection(ws, req) {
  ws.on("message", (data) => onMessage(ws, data));
  ws.on("message", (err) => onError(ws, err));
  console.log("onConnection");
}

wss.on("connection", onConnection);
wss.broadcast = broadcast;

setInterval(() => {
  wss.broadcast({ time: new Date() });
}, 5000); // envio de mensagem a cada 5 segundos

console.log(`WebScoket está rodando na porta ${process.env.PORT}`);

// wss.on("connection", (ws) => {
//   ws.on("message", (message) => {
//     wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(message);
//       }
//     });
//   });
// });
