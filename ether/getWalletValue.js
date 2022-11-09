const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/evm-utils');
const Web3 = require('web3');
const web3 = new Web3(
  'wss://mainnet.infura.io/ws/v3/bcce476756454b0a8100275d448f1d07',
);
const { utils } = web3;
const { fromWei, toBN } = utils;

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

module.exports = getWalletValue = async (address) => {
  const chain = EvmChain.ETHEREUM;

  await Moralis.start({
    apiKey: 'P7wifmaXjwI2qyaBuRhTBnW4aiwAu1c8iBOTfOrXNPwsPvqTJo1OzdikcVT9GOxQ',
  });

  const response = await Moralis.EvmApi.nft.getWalletNFTs({
    address,
    chain,
  });

  const nftList = response?.data?.result ?? [];
  let totalValue = 0;

  for (const nft of nftList) {
    while (true) {
      const response = await Moralis.EvmApi.nft.getNFTLowestPrice({
        address: nft.token_address,
        chain,
      });

      if (!response) {
        console.log('Retrying to get fp');
        await sleep(100);
        continue;
      }

      totalValue += fromWei(
        toBN(response.result?._data?.price?.toString() ?? '0'),
      );
      break;
    }
  }

  return totalValue;
};
