import Web3 from 'web3';
import detectEthereumProvider from "@metamask/detect-provider";
import DEX from "./contracts/DEX.json"
import ERC20Abi from "./ERC20ABI.json"

const getWeb3 = async () => {
    // Instantiate a web3 connection
    //return new Web3('HTTP://172.24.96.1:7545'); // Ganache
    if (window.ethereum) {
        // Initialize a web3 object using the window.ethereum as the RPC Provider!
        // window.ethereum is injected by metamask, that mean, metamask will be the RPC Provider
        const web3 = new Web3(window.ethereum)
        //window.ethereum.enable();
        const provider = await getProvider()
        // Explicitly request the user to connect its metamask account to the Dapp
        await provider.request({ method: 'eth_requestAccounts' })
        return web3
    } else if (window.web3) {
        // This is for old versions of metamask
        window.alert("You are using an old version of metamask, we kindly suggest you to update it to a more recent version")
        return window.web3
    } else {
        window.alert("Make sure to install metamask as a plugin in your browser to connect to the Dapp")
    }
}

const getProvider = async () => {
    return await detectEthereumProvider();
}

const getAccount = async () => {
    const provider = await getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });
    return accounts[0]; // Current account is stored in the 0 position of the accounts array
}

const getNetworkId = async () => {
    const provider = await getProvider();
    if (provider == window.ethereum) {
        const ethereum = window.ethereum
        return await ethereum.request({ method: 'net_version' })  // Will get the networkVersion (the number) from the window.ethereum object!
    }
    // If for some reason, the provider and the window.ethereum are not equals, return a null
    console.log("Error, the provider and the window.ethereum are not equals!")
    return null;
}

const getDexContractInstance = async (web3) => {
    const networkId = await getNetworkId();
    let dexContractAddress;
    let flag = false;
    for (let network in DEX.networks) {
        if (networkId == network) {
            dexContractAddress = DEX.networks[networkId].address;
            flag = true;
            break;
        }
    }
    if (flag == false) {
        window.alert("The DEX Contract is not deployed in this network")
        return undefined;
    } else {
        // To create an instance of a contract is required the ABI and the network Address where the contract is deployed!
        return await new web3.eth.Contract(DEX.abi, dexContractAddress);
    }
}

const getTokensContractInstances = async (web3) => {
    // Get the DEX Contract Instance
    const dexContractInstance = await getDexContractInstance(web3);
    // Get the allowed tokens to be traded in the DEX Contract
    const tokens = await dexContractInstance.methods.getTokens().call();
    //console.log("List of tokens: ", tokens);    
    
    const tokenContracts = tokens.reduce((acc,token) => ({
        ...acc, [web3.utils.hexToUtf8(token.symbol)] : new web3.eth.Contract(ERC20Abi,token.tokenAddress)
    }),{})
    //console.log("tokenContracts: ", tokenContracts);

    return tokenContracts;
}

export { getWeb3, getAccount, getNetworkId, getDexContractInstance, getTokensContractInstances };