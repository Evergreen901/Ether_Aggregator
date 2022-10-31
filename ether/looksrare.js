const Web3 = require('web3');
const abiDecoder = require('abi-decoder');
const abi = require('../abi/looksrare.json');
const Transactions = require('../mongo/transactions');
const web3 = new Web3(
  'wss://mainnet.infura.io/ws/v3/bcce476756454b0a8100275d448f1d07',
);
const contractAddress = '0x59728544b08ab483533076417fbbb2fd0b17ce3a';
const MARKETPLACE = 'LooksRare';
const { utils, eth } = web3;
const { fromWei, toBN } = utils;

const collectionContract = new eth.Contract(abi, contractAddress);

const subscribeLogEvent = (contract, eventName, onSuccess) => {
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
        console.log({ error, result }); // TODO delete
        try {
          if (!error) {
            // console.log({ result }); // TODO delete
            const parsedData = await onSuccess({ result });
            console.log({ parsedData });

            if (parsedData) {
              const newDocument = await Transactions.create(parsedData);
              console.log({ Saved: newDocument._id.toString() });
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

const onTakerBid = async ({ result }) => {
  const { transactionHash, data, topics } = result;

  const instruction = 'Sale';
  const seller = '0x' + topics[2].substr(26, 40);
  const buyer = '0x' + topics[1].substr(26, 40);
  const collectionAddress = '0x' + data.substr(218, 40);
  const tokenNumber = toBN('0x' + data.substr(258, 64)).toString();
  const price = fromWei(toBN('0x' + data.substr(386, 64)));

  return {
    marketplace: MARKETPLACE,
    transactionHash,
    instruction,
    data: { seller, buyer, collectionAddress, tokenNumber, price },
  };
};

const onTakerAsk = async ({ result }) => {
  const { transactionHash, data, topics } = result;

  const instruction = 'Sale';
  const seller = '0x' + topics[1].substr(26, 40);
  const buyer = '0x' + topics[2].substr(26, 40);
  const collectionAddress = '0x' + data.substr(218, 40);
  const tokenNumber = toBN('0x' + data.substr(258, 64)).toString();
  const price = fromWei(toBN('0x' + data.substr(386, 64)));

  return {
    marketplace: MARKETPLACE,
    transactionHash,
    instruction,
    data: { seller, buyer, collectionAddress, tokenNumber, price },
  };
};

const onCancelAllOrders = async ({ result }) => {
  const { transactionHash, data } = result;
  console.log({ onCancelAllOrders: transactionHash }); // TODO delete
  const transaction = await eth.getTransaction(transactionHash);

  return {
    marketplace: MARKETPLACE,
    transactionHash,
    instruction: 'CancelSell',
    data: {
      seller: transaction.from,
    },
  };
};

const onCancelMultipleOrders = async ({ result }) => {
  const { transactionHash, data } = result;
  console.log({ onCancelMultipleOrders: transactionHash }); // TODO delete
  const transaction = await eth.getTransaction(transactionHash);

  return {
    marketplace: MARKETPLACE,
    transactionHash,
    instruction: 'CancelSell',
    data: {
      seller: transaction.from,
    },
  };
};

const addEventListener = async () => {
  abiDecoder.addABI(abi);

  subscribeLogEvent(collectionContract, 'TakerAsk', onTakerAsk);
  subscribeLogEvent(collectionContract, 'TakerBid', onTakerBid);
  subscribeLogEvent(collectionContract, 'CancelAllOrders', onCancelAllOrders);
  subscribeLogEvent(
    collectionContract,
    'CancelMultipleOrders',
    onCancelMultipleOrders,
  );
};

module.exports = { addEventListener };
