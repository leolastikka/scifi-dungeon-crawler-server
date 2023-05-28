import express, { Express, Request, Response } from 'express';
import HTTP from 'http';
import { WebSocketServer } from 'ws';
import { Server } from './Server.js';

const DEFAULT_PORT: number = 80;
let port = Number(process.env.PORT);
if (!port) {
  port = DEFAULT_PORT;
}

const app: Express = express();
const httpServer: HTTP.Server = HTTP.createServer(app);
const wsServer: WebSocketServer = new WebSocketServer({
  server: httpServer,
  path: '/connect'
});
const server: Server = new Server();

wsServer.on('connection', server.onWebsocketConnection);

app.get('/account', (req: Request, res: Response) => {
  res.send('Account management page');
});

app.post('/password', (req: Request, res: Response) => {
  res.status(501).send('Not implemented');
});

app.get('/register', (req: Request, res: Response) => {
  res.send('Register page');
});

app.post('/register', (req: Request, res: Response) => {
  res.status(501).send('Not implemented');
});

app.get('/', (req: Request, res: Response) => {
  res.send('Scifi Dungeon Crawler Game');
});

server.start().then(() => {
  httpServer.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
  });
}).catch((error) => {
  console.error(error);
});
