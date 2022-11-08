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

            if (parsedData.instruction == TransactionTypes.sale) {
              const { processSaleRecord } = require('./common');
              await processSaleRecord();
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

const addEventListener = async () => {
  abiDecoder.addABI(abi);

  subscribeLogEvent(collectionContract, 'OrdersMatched', onSale);
  subscribeLogEvent(collectionContract, 'BeaconUpgraded', onBeaconUpgraded);
  subscribeLogEvent(collectionContract, 'OrderCancelled', onOrderCancelled);

  // TODO delete
  // const result = await onSale(
  //   '0x48097187f9d0746a656c5f8c5a1dd85d42ba984ea9d5538280e5c1434e9b1929',
  //   '0x0000000000000000000000000000000000000000000000000000000000000080' +
  //     'fa99069b80faf77fe521c70e79fd3e8769ded750e11ba333f376e30a986dc762' +
  //     '0000000000000000000000000000000000000000000000000000000000000260' +
  //     '68e8d1eabadf93110edd7ecf7ca2dc6673c38b109416c591671dfa4bd39638e0' +
  //     '0000000000000000000000000c57dcd4894833fa9c4f1bfad2a741a03e9e8310' +
  //     '0000000000000000000000000000000000000000000000000000000000000001' +
  //     '00000000000000000000000000000000006411739da1c40b106f8511de5d1fac' +
  //     '000000000000000000000000e5f1ff64fd5db9113b05f4c17f23a0e92bf3b33e' +
  //     '0000000000000000000000000000000000000000000000000000000000000ecb' +
  //     '0000000000000000000000000000000000000000000000000000000000000001' +
  //     '0000000000000000000000000000000000000000000000000000000000000000' +
  //     '00000000000000000000000000000000000000000000000000c3663566a58000' +
  //     '00000000000000000000000000000000000000000000000000000000635fd46c' +
  //     '000000000000000000000000000000000000000000000000000000006387616b' +
  //     '00000000000000000000000000000000000000000000000000000000000001a0' +
  //     '0000000000000000000000000000000040fb6bbe6bb51d9645c06f6ec5e20a2e' +
  //     '00000000000000000000000000000000000000000000000000000000000001c0' +
  //     '0000000000000000000000000000000000000000000000000000000000000000' +
  //     '0000000000000000000000000000000000000000000000000000000000000000' +
  //     '0000000000000000000000006b17d279dc4f544f7f3b93346827d5b51fa84b0c' +
  //     '0000000000000000000000000000000000000000000000000000000000000000' +
  //     '00000000000000000000000000000000006411739da1c40b106f8511de5d1fac' +
  //     '000000000000000000000000e5f1ff64fd5db9113b05f4c17f23a0e92bf3b33e' +
  //     '0000000000000000000000000000000000000000000000000000000000000ecb' +
  //     '0000000000000000000000000000000000000000000000000000000000000001' +
  //     '0000000000000000000000000000000000000000000000000000000000000000' +
  //     '00000000000000000000000000000000000000000000000000c3663566a58000' +
  //     '00000000000000000000000000000000000000000000000000000000635fce8e' +
  //     '00000000000000000000000000000000000000000000000000000000635feaae' +
  //     '00000000000000000000000000000000000000000000000000000000000001a0' +
  //     '00000000000000000000000000000000364946fc9dbd8c6f615a9ef40a6eb39b' +
  //     '00000000000000000000000000000000000000000000000000000000000001c0' +
  //     '0000000000000000000000000000000000000000000000000000000000000000' +
  //     '0000000000000000000000000000000000000000000000000000000000000000',
  // );
  // console.log(result);
};

module.exports = { addEventListener };
