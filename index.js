const Web3 = require('web3');
const abiDecoder = require('abi-decoder');
const abiX2Y2 = require('./abi/x2y2.json');
const seaport1_1 = require('./abi/seaport1.1.json');

const { connect } = require('mongoose');
const Transactions = require('./mongo/transactions');

const MONGODB_CONNECTION_STRING = 'mongodb://localhost:27017/test';

const PRECISION = 1e18;
const web3 = new Web3(
  'wss://mainnet.infura.io/ws/v3/bcce476756454b0a8100275d448f1d07',
);
const contractAddressX2Y2 = '0x74312363e45dcaba76c59ec49a7aa8a65a67eed3';

abiDecoder.addABI(abiX2Y2);
abiDecoder.addABI(seaport1_1);

const collectionContractX2Y2 = new web3.eth.Contract(
  abiX2Y2,
  contractAddressX2Y2,
);

const subscribeLogEvent = (contract, eventName, onSuccess) => {
  try {
    const foundValue = contract._jsonInterface.find(
      (o) => o.name === eventName && o.type === 'event',
    );

    const subscription = web3.eth.subscribe(
      'logs',
      {
        address: contract.options.address,
        topics: [foundValue.signature],
      },
      async (error, result) => {
        try {
          if (!error) {
            const parsedData = await onSuccess(result);
            console.log({ parsedData });
            const newDocument = await Transactions.create(parsedData);
            console.log({ Saved: newDocument._id.toString() });
          }
        } catch (error1) {
          console.log({ error1 });
        }
      },
    );
  } catch (error2) {
    console.log({ error2 });
  }
};

const onEvProfit = async (result) => {
  const transaction = await web3.eth.getTransaction(result.transactionHash);
  const transactionReceipt = await web3.eth.getTransactionReceipt(
    result.transactionHash,
  );

  const price = Web3.utils.toBN(transaction.value) / PRECISION;

  for (const log of transactionReceipt.logs) {
    if (
      log.topics?.length == 3 &&
      log.topics[2] ==
        '0x00000000000000000000000074312363e45dcaba76c59ec49a7aa8a65a67eed3'
    ) {
      const tokenLog = transactionReceipt.logs.filter(
        (itm) => itm.topics?.length == 4,
      )?.[0];
      return {
        marketplace: 'X2Y2',
        signature: log.transactionHash,
        instruction: 'Sale',
        data: {
          seller: transaction.from,
          buyer: '0x' + log.topics[1].slice(-40),
          collectionAddress: tokenLog?.address,
          tokenNumber: Web3.utils
            .toBN(
              tokenLog.data == '0x'
                ? log.topics[3]
                : tokenLog.data.substring(2, 66),
            )
            .toString(),
          price: Web3.utils.toBN(log.data) / PRECISION,
        },
      };
    }

    if (
      log.data == '0x' &&
      log.topics?.length == 4 &&
      log.topics[2] !=
        '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      return {
        marketplace: 'X2Y2',
        signature: log.transactionHash,
        instruction: 'Sale',
        data: {
          collectionAddress: log.address,
          seller: '0x' + log.topics[1].slice(-40),
          buyer: '0x' + log.topics[2].slice(-40),
          tokenNumber: Web3.utils.toBN(log.topics[3]).toString(),
          price,
        },
      };
    }
  }
};

const onEvCancel = async (result) => {
  const transaction = await web3.eth.getTransaction(result.transactionHash);
  const transactionReceipt = await web3.eth.getTransactionReceipt(
    result.transactionHash,
  );

  for (let i = 0; i < transactionReceipt.logs.length; i++) {
    try {
      return {
        marketplace: 'X2Y2',
        signature: log.transactionHash,
        instruction: 'CancelSell',
        data: {
          seller: transaction.from,
        },
      };
    } catch (err) {
      console.log({
        i,
        err,
        address: transactionReceipt.logs[i].address,
      });
    }
  }
};

(async () => {
  await connect(MONGODB_CONNECTION_STRING);
  subscribeLogEvent(collectionContractX2Y2, 'EvProfit', onEvProfit);
  subscribeLogEvent(collectionContractX2Y2, 'EvCancel', onEvCancel);
})();
