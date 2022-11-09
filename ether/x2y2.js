const Web3 = require('web3');
const abiDecoder = require('abi-decoder');
const abi = require('../abi/x2y2.json');
const Transactions = require('../mongo/transactions');
const TransactionTypes = require('./transactionTypes');
const web3 = new Web3(
  'wss://mainnet.infura.io/ws/v3/bcce476756454b0a8100275d448f1d07',
);
const contractAddress = '0x74312363e45dcaba76c59ec49a7aa8a65a67eed3';
const MARKETPLACE = 'X2Y2';
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
            const parsedData = await onSuccess(result.transactionHash);
            console.log({ parsedData }); // TODO delete

            if (!parsedData) {
              return;
            }

            const newDocument = await Transactions.create(parsedData);
            console.log({ Saved: newDocument._id.toString() });

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

const onEvProfit = async (transactionHash) => {
  const transaction = await eth.getTransaction(transactionHash);
  const transactionReceipt = await eth.getTransactionReceipt(transactionHash);

  const price = fromWei(toBN(transaction.value));

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
        marketplace: MARKETPLACE,
        transactionHash,
        instruction: TransactionTypes.sale,
        data: {
          seller: transaction.from,
          buyer: '0x' + log.topics[1].slice(-40),
          collectionAddress: tokenLog?.address,
          tokenNumber: utils
            .toBN(
              tokenLog.data == '0x'
                ? log.topics[3]
                : tokenLog.data.substr(2, 64),
            )
            .toString(),
          price: fromWei(toBN(log.data)),
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
        instruction: TransactionTypes.sale,
        data: {
          collectionAddress: log.address,
          seller: '0x' + log.topics[1].slice(-40),
          buyer: '0x' + log.topics[2].slice(-40),
          tokenNumber: toBN(log.topics[3]).toString(),
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

const onEvCancel = async (transactionHash) => {
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

const addEventListener = () => {
  abiDecoder.addABI(abi);

  subscribeLogEvent(collectionContract, 'EvProfit', onEvProfit);
  subscribeLogEvent(collectionContract, 'EvCancel', onEvCancel);
};

module.exports = { addEventListener };
