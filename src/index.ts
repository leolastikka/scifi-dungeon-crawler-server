import express, { Express, Request, Response } from 'express';
import HTTP from 'http';
import WebSocket, { WebSocketServer } from 'ws';

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

wsServer.on('connection', (ws: WebSocket.WebSocket) => {
  console.log('ws user connected');

  ws.onmessage = (event: WebSocket.MessageEvent) => {
    ws.send(event.data);
  };

  ws.onclose = (event: WebSocket.CloseEvent) => {
    console.log('ws user closed')
  };
});

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
  res.send('Scifi Dungeon Crawler Server');
});

httpServer.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
