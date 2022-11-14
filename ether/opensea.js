const Web3 = require('web3');
const abiDecoder = require('abi-decoder');
const abi = require('../abi/seaport1.1.json');
const Transactions = require('../mongo/transactions');
const TransactionTypes = require('./transactionTypes');
const web3 = new Web3(
  'wss://mainnet.infura.io/ws/v3/bcce476756454b0a8100275d448f1d07',
);
const contractAddress = '0x00000000006c3852cbef3e08e8df289169ede581';
const MARKETPLACE = 'OpenSea';
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
            console.log({ parsedData }); // TODO delete

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
  const transactionReceipt = await eth.getTransactionReceipt(transactionHash);

  // console.log({ transaction }); // FIXME
  // console.log({ data });
  const collectionAddress = '0x' + data?.[0].substr(410, 40);
  const tokenNumber = toBN(data?.[0].substr(450, 64)).toString();
  // console.log([
  //   toBN(data?.[0].substr(834, 64)),
  //   toBN(data?.[0].substr(1154, 64)),
  //   toBN(data?.[0].substr(1474, 64)),
  // ]);
  const price = fromWei(
    Web3.utils
      .toBN(data?.[0].substr(834, 64))
      .add(toBN(data?.[0].substr(1154, 64)))
      .add(toBN(data?.[0].substr(1474, 64))),
  );

  const instruction = 'Sale';

  for (const log of transactionReceipt.logs) {
    // console.log({ log }); // FIXME
    if (
      log.topics?.length == 3 &&
      log.topics[2].slice(-40).toLowerCase() ==
        transaction.from.slice(-40).toLowerCase()
    ) {
      const tokenLog = transactionReceipt.logs.filter(
        (itm) => itm.topics?.length == 4,
      )?.[0];

      // console.log({ tokenLog });

      return {
        marketplace: MARKETPLACE,
        transactionHash,
        instruction: TransactionTypes.sale,
        data: {
          seller: transaction.from,
          buyer: '0x' + log.topics[1].slice(-40),
          // collectionAddress: tokenLog?.address,
          // tokenNumber: Web3.utils
          //   .toBN(
          //     tokenLog.data == '0x'
          //       ? tokenLog.topics[3]
          //       : tokenLog.data.substr(2, 64),
          //   )
          //   .toString(),
          // price: fromWei(toBN(log.data)),
          collectionAddress,
          tokenNumber,
          price,
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
        marketplace: MARKETPLACE,
        transactionHash,
        instruction,
        data: {
          seller: '0x' + log.topics[1].slice(-40),
          buyer: transaction.from,
          // collectionAddress: log.address,
          // tokenNumber: toBN(log.topics[3]).toString(),
          // price: fromWei(toBN(transaction.value)),
          collectionAddress,
          tokenNumber,
          price,
        },
      };
    }

    if (
      log.data.length == 130 &&
      log.topics?.length == 4 &&
      log.topics[2] == transaction.hash
    ) {
      const transferLogs = transactionReceipt.logs.filter(
        (itm) => itm.topics?.length == 3 && itm.data.length == 66,
      );

      // const price = transferLogs
      //   .map((itm) => fromWei(toBN(itm.data)))
      //   .reduce((a, b) => a + b, 0);

      return {
        marketplace: MARKETPLACE,
        transactionHash,
        instruction,
        data: {
          // collectionAddress: log.address,
          seller: transaction.from,
          buyer: '0x' + log.topics[3].slice(-40),
          // tokenNumber: toBN(log.data.slice(2, 66)).toString(),
          collectionAddress,
          tokenNumber,
          price,
        },
      };
    }
  }

  console.log(
    `------------------ Unknown Sale Transaction of ${MARKETPLACE} ------------------`,
  );
  console.log({ transaction });
};

const onCancel = async (transactionHash) => {
  const transaction = await eth.getTransaction(transactionHash);

  return {
    marketplace: MARKETPLACE,
    transactionHash,
    instruction: TransactionTypes.cancelSell,
    data: {
      seller: transaction.from,
    },
  };
};

const addEventListener = async (callback) => {
  abiDecoder.addABI(abi);

  subscribeLogEvent(collectionContract, 'OrderCancelled', onCancel, callback);
  subscribeLogEvent(collectionContract, 'OrderFulfilled', onSale, callback);
};

module.exports = { addEventListener };
