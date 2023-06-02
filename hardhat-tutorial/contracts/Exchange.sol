// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20{
    address public cryptoDevTokenAddress;

    constructor(address _CryptoDevToken) ERC20("CryptoDev LP Token", "CDLP"){
        // check if te address is not a null address
        require(_CryptoDevToken != address(0), "Token address is a null address!");
        cryptoDevTokenAddress = _CryptoDevToken;
    }

    /// @dev Returns the amount of Crypto Dev Tokens held by this contract
    function getReserve() public view returns(uint){
        return ERC20(cryptoDevTokenAddress).balanceOf(address(this));
    } 

    /// @dev Adds liquidity to exchange
    function addLiquidity(uint _amount) public payable returns(uint){
        uint liquidity;
        uint ethBalance = address(this).balance;
        uint cryptoDevTokenReserve = getReserve();
        ERC20 cryptoDevToken = ERC20(cryptoDevTokenAddress);

        // if the reserve is currently empty, take in any ratio of ETH and cryptodevToken
        if(cryptoDevTokenReserve == 0){
            cryptoDevToken.transferFrom(msg.sender, address(this), _amount);
            // mint ethBalance amount of LP tokens to the user the first time it liquidity is added
            liquidity = ethBalance;
            // send the user LP tokens
            _mint(msg.sender, liquidity);
        }
        else{
            uint ethReserve = ethBalance - msg.value;
            // maintaining the ratio to prevent large price impacts
            uint cryptoDevTokenAmount = (msg.value * cryptoDevTokenReserve)/(ethReserve);
            require(_amount >= cryptoDevTokenAmount, "Amount of Crypto Dev Tokens sent is less than minimum!");
            // maintain liquidity ratio
            liquidity = (totalSupply() * msg.value)/(ethReserve);
            _mint(msg.sender, liquidity);
        }
        return liquidity;
    } 

    /// @dev Removing liquidity from exchange
    function removeLiquidity(uint _amount) public returns(uint, uint){
        require(_amount > 0, "LP tokens should be greater than zero!");
        uint ethReserve = address(this).balance;
        // totalsupply of LP tokens
        uint _totalSupply = totalSupply();


        // amount of ETH to be sent back is based on a ratio
        uint ethAmount = (_amount * ethReserve)/(_totalSupply);
        // amount of crypto dev token to be sent back depemds on a ratio
        uint cryptoDevTokenAmount = (_amount * getReserve())/(_totalSupply);
        // burn LP tokens returned by the user 
        _burn(msg.sender, _amount);
        // transfer ETH back to user
        payable(msg.sender).transfer(ethAmount);
        // transfer crypto dev token
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, cryptoDevTokenAmount);

        return (ethAmount, cryptoDevTokenAmount);
    }

    /// @dev Returns the amoumt of ETH/Crypto dev tokens that would be returned to the user in swao
    function getAmountOfTokens(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) public pure returns(uint256){
        require(inputReserve > 0 && outputReserve > 0, "Invalid reserves!");
        // charge 1% fees for each swap
        uint256 inputAmountWithFee = inputAmount * 99;
        // use pre-defined ratios

        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 100) + inputAmountWithFee;
        return numerator / denominator;
    } 

    /// @dev Swap ETH for Crypto dev tokens
    function ethToCryptoDevTokens(uint _minTokens) public payable{
        uint tokenReserve = getReserve();

        uint tokensBought = getAmountOfTokens(msg.value, address(this).balance - msg.value, tokenReserve);

        require(tokensBought > _minTokens, "insufficient output amount!");

        // transfer the tokens to the user
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, tokensBought);
    }

    /// @dev Swap CryptoDev token to ETH
    function cryptoDevTokenToEth(uint _tokensSold, uint _mintEth) public{
        uint tokenReserve = getReserve();

        uint ethBought = getAmountOfTokens(_tokensSold, tokenReserve, address(this).balance);

        require(ethBought > _mintEth, "Insuffucent output amount!");
        // transfer CryptoDev Tokens to this contract

        ERC20(cryptoDevTokenAddress).transferFrom(msg.sender, address(this), _tokensSold);

        // send the ETH to the user
        payable(msg.sender).transfer(ethBought);
    }
}