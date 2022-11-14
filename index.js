const { connect } = require('mongoose');
const { Server } = require('ws');
const { createServer } = require('http');

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

const WEBSOCKET_PORT = 3337;
const MONGODB_CONNECTION_STRING = 'mongodb://0.0.0.0:27017/test';

const server = createServer();
const wss = new Server({ server });

wss.on('connection', (ws) => {
  console.log('connected');
});

wss.on('close', function close() {
  console.log('closed');
});

const broadcast = function (data) {
  wss.clients.forEach((client) => client.send(JSON.stringify(data)));
};

server.listen(WEBSOCKET_PORT);

(async () => {
  await connect(MONGODB_CONNECTION_STRING);

  addEventListenerForOpenSea(broadcast);
  addEventListenerForX2Y2(broadcast);
  addEventListenerForBlur(broadcast);
  addEventListenerForLooksrare(broadcast);
})();
