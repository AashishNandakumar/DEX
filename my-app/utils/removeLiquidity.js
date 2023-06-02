import { Contract, providers, utils, BigNumber } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
} from "../constants/index";

// Remove liquidity by accepting a share of LP(liquidity pool) tokens
export const removeLiquidity = async (signer, removeLPTokensWei) => {
  const exchangeContract = new Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    EXCHANGE_CONTRACT_ABI,
    signer
  );

  const tx = await exchangeContract.removeLiquidity(removeLPTokensWei);
  await tx.wait();
};

// calculate the amount of ETH and CD tokens to be returned to the user
export const getTokensAfterRemove = async (
  provider,
  removeLPTokenWei,
  _ethBalance,
  cryptoDevTokenReserve
) => {
  try {
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      provider
    );

    // get the total supply of LP tokens
    const _totalSupply = await exchangeContract.totalSupply();

    // decide the amount of ETH and CD tokens to return the user using ratio
    const _removeEther = _ethBalance.mul(removeLPTokenWei).div(_totalSupply);
    const _removeCD = cryptoDevTokenReserve
      .mul(removeLPTokenWei)
      .div(_totalSupply);

    // return as an object
    return { _removeEther, _removeCD };
  } catch (err) {
    console.error(err);
  }
};
