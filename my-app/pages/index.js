import { BigNumber, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useState, useRef } from "react";
import Web3Modal, { getProviderDescription } from "web3modal";
import styles from "../styles/Home.module.css";
import { addLiquidity, calculateCD } from "@/utils/addLiquidity";
import {
  getCDTokensBalance,
  getEtherBalance,
  getLPTokensBalance,
  getReserveOfCDTokens,
} from "../utils/getAmounts";
import {
  getTokensAfterRemove,
  removeLiquidity,
} from "../utils/removeLiquidity";
import { swapTokens, getAmountOfTokensReceivedFromSwap } from "../utils/swap";

export default function Home() {
  /*  State variables:  */

  // loading screen
  const [loading, setLoading] = useState(false);
  // 2 tabs = liquidity, swap tab
  const [liquidityTab, setLiquidityTab] = useState(true);

  const zero = BigNumber.from(0);

  // keep track of the balance of the user's ether
  const [ethbalance, setEtherBalance] = useState(zero);
  // keep track of CryptoToken reserve
  const [reservedCD, setReservedCD] = useState(zero);
  // keep track of ether balance in the contract
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
  // keep track of the user's CD tokens
  const [cdBalance, setCDBalance] = useState(zero);
  // keep track of the user's LP tokens
  const [lpBalance, setLPBalance] = useState(zero);

  // keep track of the amount of ether the user wants to add to liquidity
  const [addEther, setAddEther] = useState(zero);
  // keep track of the amount of CD tokens the user wants to add to liquidity
  const [addCDTokens, setAddCDTokens] = useState(zero);
  // keep track of the CD tokens the user wants back
  const [removeCD, setRemoveCD] = useState(zero);
  // keep track of the ether the user wants back
  const [removeEther, setRemoveEther] = useState(zero);
  // keep track of the LP tokens to remove
  const [removeLPTokens, setRemoveLPTokens] = useState("0");

  // keep track the amount the user wants to swap
  const [swapAmount, setSwapAmount] = useState("");
  // keep track of the tokens to recieve after swap
  const [tokenToBeReceivedAfterSwap, setTokenToBeReceivedAfterSwap] =
    useState(zero);
  // keep track whether to swap ETH or CD tokens
  const [ethSelected, setEthSelected] = useState(false);

  // create an empty instance of web3modal
  const web3ModalRef = useRef();

  // keep track whether the wallet is connected
  const [walletConnected, setWalletConnected] = useState(false);

  /* SWAP FUNCTIONS */
  // get the balance of various tokens
  const getAmounts = async () => {
    try {
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();

      // get ETH balance of user
      const _ethBalance = await getEtherBalance(provider, address);
      // get the CD balance of user
      const _cdBalance = await getCDTokensBalance(provider, address);
      // get the LP balance of user
      const _lpBalance = await getLPTokensBalance(provider, address);
      // get reserve CD token balance of Exchange contract
      const _reservedCD = await getReserveOfCDTokens(provider);
      // get reserve ETH balance of Exchange contract
      const _ethBalanceContract = await getEtherBalance(provider, null, true);

      // set the state variables
      setEtherBalance(_ethBalance);
      setCDBalance(_cdBalance);
      setLPBalance(_lpBalance);
      setReservedCD(_reservedCD);
      setEtherBalanceContract(_ethBalanceContract);
    } catch (err) {
      console.error(err);
    }
  };

  // swap tokens
  const _swapTokens = async () => {
    try {
      // converting the input to BigNumber
      const swapAmountToWei = utils.parseEther(swapAmount);

      if (!swapAmountToWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);

        await swapTokens(
          signer,
          swapAmountToWei,
          tokenToBeReceivedAfterSwap,
          ethSelected
        );
        setLoading(false);

        await getAmounts();
        setSwapAmount("");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setSwapAmount("");
    }
  };

  // get the required no of tokens after swap
  const _getAmountOfTokensReceivedFromSwap = async (_swapAmount) => {
    try {
      const _swapAmountWei = utils.parseEther(_swapAmount.toString());

      if (!_swapAmountWei.eq(zero)) {
        const provider = await getProviderOrSigner();

        const _ethBalance = await getEtherBalance(provider, null, true);

        const amountOfTokens = await getAmountOfTokensReceivedFromSwap(
          _swapAmountWei,
          provider,
          ethSelected,
          _ethBalance,
          reservedCD
        );

        setTokenToBeReceivedAfterSwap(amountOfTokens);
      } else {
        setTokenToBeReceivedAfterSwap(zero);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* LIQUIDITY FUNCTIONS */
  // add liquidity to the DEX
  const _addLiquidity = async () => {
    try {
      const addEtherWei = utils.parseEther(addEther.toString());

      if (!addCDTokens.eq(zero) && !addEtherWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);

        await addLiquidity(signer, addCDTokens, addEtherWei);

        setLoading(false);

        setAddCDTokens(zero);
        await getAmounts();
      } else {
        setAddCDTokens(zero);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // remove liquidity DEX
  const _removeLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);

      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);

      await removeLiquidity(signer, removeLPTokensWei);

      setLoading(false);
      setRemoveCD(zero);
      setRemoveEther(zero);
    } catch (err) {
      console.error(err);
    }
  };

  // get the tokens after removing liquidity
  const _getTokensAfterRemove = async (_removeLPTokens) => {
    try {
      const provider = await getProviderOrSigner();

      const removeLPTokensWei = utils.parseEther(_removeLPTokens);

      const _ethBalance = await getEtherBalance(provider, null, true);
      const cryptoDevTokenReserve = await getReserveOfCDTokens(provider);

      const { _removeEther, _removeCD } = await getTokensAfterRemove(
        provider,
        removeLPTokensWei,
        _ethBalance,
        cryptoDevTokenReserve
      );

      setRemoveEther(_removeEther);
      setRemoveCD(_removeCD);
    } catch (err) {
      console.error(err);
    }
  };
  /* END */

  // connect to metamask
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // get a provider or a signer object representing ETH RPC
  const getProviderOrSigner = async (Signer = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 11155111) {
      window.alert("please change network to Sepolia !");
      throw new Error("Change network to Sepolia");
    }

    if (Signer) {
      const signer = web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  };

  // Check for wallet connection
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: 11155111,
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getAmounts();
    }
  }, [walletConnected]);

  // create a button, which changes state depending on various state changes
  const renderButton = () => {
    // connect wallet button
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }
    // Loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    //
    if (liquidityTab) {
      return (
        <div>
          <div className={styles.description}>
            You have:
            <br />
            {/* Converting bigni=umber to a string */}
            {utils.formatEther(cdBalance)} Crypto Dev Tokens
            <br />
            {utils.formatEther(ethbalance)} Ether
            <br />
            {utils.formatEther(lpBalance)} Crypto Dev LP tokens
          </div>
          <div>
            {utils.parseEther(reservedCD.toString()).eq(zero) ? (
              <div>
                <input
                  type="number"
                  placeholder="Amount of Ether"
                  onChange={(e) => setAddEther(e.target.value || "0")}
                  className={styles.input}
                />
                <input
                  type="number"
                  placeholder="Amount of CD tokens"
                  onChange={(e) =>
                    setAddCDTokens(
                      BigNumber.from(utils.parseEther(e.target.value || "0"))
                    )
                  }
                  className={styles.input}
                />
                <button onClick={_addLiquidity} className={styles.button1}>
                  Add
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  placeholder="Amount of ether"
                  onChange={async (e) => {
                    setAddEther(e.target.value || "0");

                    const _addCDTokens = await calculateCD(
                      e.target.value || "0",
                      etherBalanceContract,
                      reservedCD
                    );
                    setAddCDTokens(_addCDTokens);
                  }}
                  className={styles.input}
                />
                <div className={styles.inputDiv}>
                  {`You will need ${utils.formatEther(
                    addCDTokens
                  )} Crypto Dev Tokens`}
                </div>
                <button className={styles.button1} onClick={_addLiquidity}>
                  Add
                </button>
              </div>
            )}
            <div>
              <input
                type="number"
                placeholder="Amount of LP Tokens"
                onChange={async (e) => {
                  setRemoveLPTokens(e.target.value || "0");

                  await _getTokensAfterRemove(e.target.value);
                }}
                className={styles.input}
              />
              <div className={styles.inputDiv}>
                {`You will get ${utils.formatEther(
                  removeCD
                )} Crypto Dev tokens and ${utils.formatEther(removeEther)} ETH`}
              </div>
              <button className={styles.button1} onClick={_removeLiquidity}>
                Remove
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <input
            type="number"
            placeholder="Amount"
            onChange={async (e) => {
              setSwapAmount(e.target.value || "");

              await _getAmountOfTokensReceivedFromSwap(e.target.value || "0");
            }}
            className={styles.input}
            value={swapAmount}
          />
          <select
            className={styles.select}
            name="dropdown"
            id="dropdown"
            onChange={async () => {
              setEthSelected(!ethSelected);
              await _getAmountOfTokensReceivedFromSwap(0);
              setSwapAmount("");
            }}
          >
            <option value="eth">Ethereum</option>
            <option value="cryptoDevTokens">Crypto Dev Tokens</option>
          </select>
          <br />
          <div className={styles.inputDiv}>
            {ethSelected
              ? `You will get ${utils.formatEther(
                  tokenToBeReceivedAfterSwap
                )} Crypto Dev Tokens`
              : `You will get ${utils.formatEther(
                  tokenToBeReceivedAfterSwap
                )} ETH`}
          </div>
          <button className={styles.button1} onClick={_swapTokens}>
            Swap
          </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Ash Devs</title>
        <meta name="description" content="DEX" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Ash Dev Exchange</h1>
          <div className={styles.description}>
            Exchange Ethereum &#60; &#62; Crypto Dev Tokens
          </div>
          <div>
            <button
              className={styles.button}
              onClick={() => setLiquidityTab(true)}
            >
              Liquidity
            </button>
            <button
              className={styles.button}
              onClick={() => setLiquidityTab(false)}
            >
              Swap
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodev.svg" />
        </div>
      </div>
      <footer className={styles.footer}>Made with &#10084; by Ash Devs</footer>
    </div>
  );
}
