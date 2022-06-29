import React, { useState, useEffect } from "react";
import { getWeb3, getDexContractInstance, getTokensContractInstances, getAccount } from "./utils";
import App from "./App";

function LoadingContainer() {
    const [web3, setWeb3] = useState(undefined);
    const [dexContract, setDexContract] = useState(undefined);
    const [tokensContracts, setTokensContracts] = useState(undefined);
    const [account, setAccount] = useState(undefined);

    useEffect(() => {
        const init = async () => {
            // Getting the data from the blockchain!
            const web3 = await getWeb3();
            const dexContract = await getDexContractInstance(web3);
            const tokensContracts = await getTokensContractInstances(web3);
            const account = await getAccount(web3);

            // update the values of the state variables
            setWeb3(web3);
            setDexContract(dexContract);
            setTokensContracts(tokensContracts);
            setAccount(account);
        }
        init();
    },[]);

    const isReady = () => {
        return (
            typeof(web3) !== 'undefined' &&
            typeof(dexContract) !== 'undefined' &&
            typeof(tokensContracts) !== 'undefined' &&
            typeof(account) !== 'undefined'
        )
    }

    if(isReady()){
        return(
        <App
            web3={web3}
            account={account}
            dexContract={dexContract}
            tokensContracts={tokensContracts}
        />    
        )
    } else {
        return(
            <div>Loading the blockchain connection...</div>
        )
    }
}

export default LoadingContainer;