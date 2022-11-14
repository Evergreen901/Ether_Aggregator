const { connect } = require('mongoose');
const WebSocket = require('ws');
const { createServer } = require('http');
const { Server } = WebSocket;

const {
  addEventListener: addEventListenerForOpenSea,
} = require('./ether/opensea');
const { addEventListener: addEventListenerForX2Y2 } = require('./ether/x2y2');
const {
  addEventListener: addEventListenerForBlur,
} = require('./ether/blur.io');
const {
  addEventListener: addEventListenerForLooksrare,
} = require('./ether/looksrare');

const MONGODB_CONNECTION_STRING = 'mongodb://0.0.0.0:27017/test';

const server = createServer();
const wss = new Server({ server });

wss.on('connection', (ws) => {
  ws.isAlive = true;
});

wss.on('close', function close() {
  clearInterval(interval);
});

server.listen(3337);

(async () => {
  await connect(MONGODB_CONNECTION_STRING);

  addEventListenerForOpenSea();
  addEventListenerForX2Y2();
  addEventListenerForBlur();
  addEventListenerForLooksrare();
})();
