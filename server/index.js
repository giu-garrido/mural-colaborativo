// Servidor mínimo (placeholder) só para testar a infra:
// sobe na porta 3000 e aceita conexões Socket.IO vindas do Nginx.
// A lógica real (eventos dos post-its + Redis) fica para o backend.

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok');
});

const io = new Server(httpServer);

io.on('connection', (socket) => {
  console.log('cliente conectado:', socket.id);
  socket.emit('notes:init', []);
  socket.on('disconnect', () => console.log('cliente desconectado:', socket.id));
});

httpServer.listen(PORT, () => {
  console.log(`server ouvindo na porta ${PORT}`);
});
