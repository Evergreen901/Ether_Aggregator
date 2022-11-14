const Web3 = require('web3');
const abiDecoder = require('abi-decoder');
const abi = require('../abi/blur.io.json');
const Transactions = require('../mongo/transactions');
const TransactionTypes = require('./transactionTypes');
const web3 = new Web3(
  'wss://mainnet.infura.io/ws/v3/bcce476756454b0a8100275d448f1d07',
);
const contractAddress = '0x000000000000ad05ccc4f10045630fb830b95127';
const MARKETPLACE = 'Blur.io';
const { utils, eth } = web3;
const { fromWei, toBN } = utils;

const collectionContract = new eth.Contract(abi, contractAddress);

const subscribeLogEvent = (contract, eventName, onSuccess, callback) => {
  try {
    const foundValue = contract._jsonInterface.find(
      (o) => o.name === eventName && o.type === 'event',
    );

    const subscription = eth.subscribe(
      'logs',
      {
        address: contract.options.address,
        topics: [foundValue.signature],
      },
      async (error, result) => {
        try {
          if (!error) {
            // console.log({ result }); // TODO delete
            const parsedData = await onSuccess(
              result.transactionHash,
              result.data,
            );
            console.log({ parsedData });

            if (!parsedData) {
              return;
            }

            const newDocument = await Transactions.create(parsedData);
            console.log({ Saved: newDocument._id.toString() });

            if (callback) callback(parsedData);

            if (parsedData.instruction == TransactionTypes.sale) {
              const { processSaleRecord } = require('./common');
              await processSaleRecord(parsedData);
            }
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

const onSale = async (transactionHash, ...data) => {
  const transaction = await eth.getTransaction(transactionHash);
  const instruction = TransactionTypes.sale;

  if (data?.[0].length == 2178) {
    const seller = '0x' + data?.[0].substr(282, 40);
    const buyer = transaction.from; //'0x' + data?.[0].substr(1242, 40);
    const collectionAddress = '0x' + data?.[0].substr(474, 40);
    const tokenNumber = toBN('0x' + data?.[0].substr(538, 40)).toString();
    const price = fromWei(toBN(data?.[0].substr(730, 40)));

    return {
      marketplace: MARKETPLACE,
      transactionHash,
      instruction,
      data: { seller, buyer, collectionAddress, tokenNumber, price },
    };
  } else if (data?.[0].length == 2306) {
    const seller = '0x' + data?.[0].substr(282, 40);
    const buyer = transaction.from;
    const collectionAddress = '0x' + data?.[0].substr(474, 40);
    const tokenNumber = toBN('0x' + data?.[0].substr(538, 40)).toString();
    const price = fromWei(toBN(data?.[0].substr(730, 40)));

    return {
      marketplace: MARKETPLACE,
      transactionHash,
      instruction,
      data: { seller, buyer, collectionAddress, tokenNumber, price },
    };
  }

  console.log(
    `------------------ Unknown Sale Transaction of ${MARKETPLACE} ------------------`,
  );
  console.log({ transaction });
};

const onBeaconUpgraded = async (transactionHash) => {
  console.log({ onBeaconUpgraded: transactionHash }); // TODO delete
  const transaction = await eth.getTransaction(transactionHash);
  const transactionReceipt = await eth.getTransactionReceipt(transactionHash);
};

const onOrderCancelled = async (transactionHash) => {
  console.log({ onOrderCancelled: transactionHash }); // TODO delete
  const transaction = await eth.getTransaction(transactionHash);
  const instruction = TransactionTypes.cancelSell;

  return {
    marketplace: MARKETPLACE,
    transactionHash,
    instruction,
    data: {
      seller: transaction.from,
    },
  };
};

const addEventListener = async (callback) => {
  abiDecoder.addABI(abi);

  subscribeLogEvent(collectionContract, 'OrdersMatched', onSale, callback);
  subscribeLogEvent(
    collectionContract,
    'BeaconUpgraded',
    onBeaconUpgraded,
    callback,
  );
  subscribeLogEvent(
    collectionContract,
    'OrderCancelled',
    onOrderCancelled,
    callback,
  );
};

module.exports = { addEventListener };
