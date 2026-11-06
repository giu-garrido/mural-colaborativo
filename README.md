# Mural Colaborativo em Tempo Real

É um mural de post-its que várias pessoas usam ao mesmo tempo pelo navegador. Quem estiver conectado pode criar, arrastar, editar e apagar post-its, e todo mundo vê as mudanças na hora. Os serviços rodam em containers Docker orquestrados com Docker Compose, e o servidor pode ser escalado para mais de uma réplica, sincronizadas via Redis pub/sub.

## Arquitetura

```
Navegador ──► Nginx (:8080) ──► server (Node + Socket.IO, :3000) ──► Redis (:6379)
                                 server (réplica 2, opcional) ──┘
```

| Serviço  | Imagem                         | Papel |
|----------|--------------------------------|-------|
| `nginx`  | `nginx:alpine` (oficial)       | Serve o frontend estático e faz proxy das conexões WebSocket (`/socket.io/`) para o `server` |
| `server` | Implementação própria (Node + Socket.IO) | Recebe os eventos dos clientes, grava no Redis e faz broadcast para todos |
| `redis`  | `redis:7-alpine` (oficial)     | Guarda os post-its (hash `notes`: id → JSON) e faz o pub/sub entre réplicas |

Só o Nginx fica exposto para fora (porta `8080`). O `server` e o Redis ficam na rede interna do Docker e se encontram pelo nome do serviço (`server`, `redis`).

### Fluxo de um evento

1. O cliente emite, por exemplo, `note:move`.
2. A réplica que recebeu o evento grava no Redis e faz broadcast.
3. O adapter do Redis repassa o evento às outras réplicas.
4. Todas as abas atualizam, não importa em qual réplica cada uma está conectada.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/)
- Docker Compose v2 (já vem com o Docker Desktop; no Linux, pacote `docker-compose-plugin`)

Não é preciso instalar Node nem Redis na máquina, porque tudo roda dentro dos containers.

## Como rodar

Na raiz do repositório:

```bash
docker compose up --build
```

Depois, abra **http://localhost:8081**. Para ver a sincronização, abra duas abas lado a lado.

Outros comandos úteis:

```bash
docker compose ps              # lista os containers e o estado de cada um
docker compose logs -f server  # acompanha os logs do servidor
docker compose down            # para e remove os containers
```

## Contrato de eventos (Socket.IO)

| Evento        | Direção                              | Payload                       |
|---------------|--------------------------------------|-------------------------------|
| `notes:init`  | servidor → cliente (ao conectar)     | lista com todos os post-its   |
| `note:create` | cliente → servidor → todos           | `{ id, text, x, y, color }`   |
| `note:update` | cliente → servidor → todos           | `{ id, text, color }`         |
| `note:move`   | cliente → servidor → todos           | `{ id, x, y }`                |
| `note:delete` | cliente → servidor → todos           | `{ id }`                      |

## Estrutura do repositório

```
├── docker-compose.yml   # orquestra nginx, server e redis
├── README.md
├── nginx/
│   └── nginx.conf       # estáticos + proxy /socket.io/ com upgrade de WebSocket
├── frontend/            # servido pelo Nginx
│   ├── index.html
│   ├── style.css
│   └── app.js           # render, arrastar/editar post-its, cliente Socket.IO
├── server/              # serviço de implementação própria
│   ├── Dockerfile
│   ├── package.json
│   └── index.js         # Express + Socket.IO + Redis
└── docs/
    └── documentacao.pdf # documentação do projeto
```

## Equipe

| Papel                        | Integrante |
|------------------------------|------------|
| Infra                        | Giulia Garrido |
| Backend                      |            |
| Frontend                     |            |
| Documentação (estrutura)     |            |
| Documentação (conteúdo) + demo |          |
