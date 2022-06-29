import React, { useState, useEffect } from 'react';
import Header from './Header';

function App({web3,account,dexContract,tokensContracts}) {
  /*
  console.log("Hello from the App component")
  console.log("web3 object: ", web3);
  console.log("account object: ", account);
  */
  console.log("dexContract object: ", dexContract);
  //console.log("dexContract address: ", dexContract.options.address);
  //console.log("tokensContracts: ", tokensContracts);

  const[tokens, setTokens] = useState([]);
  const[user, setUser] = useState({
    accounts: [],
    selectedToken: undefined
  })

  const selectToken = token => {
    setUser({...user, selectedToken: token})
  }

  useEffect(() => {
      const init = async () => {
        console.log("dexContract object inside the useEffect: ", dexContract);
        const rawTokens = await dexContract.methods.getTokens().call();
        // tokens will be an array of objects!
        /* Use the original tokens that were retrieved from the blockchain to create an array of object, each object will represent a single token and will be composed of two properties:
        *     - The first property will be the exact data of a single token
              - The second property will be the symbol of the token transformed onto ascii format
        */
        const tokens = rawTokens.map(token => ({
            ...token,
            symbol: web3.utils.hexToUtf8(token.symbol)
        }))
        setTokens(tokens);
        setUser({
          account,
          selectedToken: tokens[0]
        })
      }
      init();
  }, [])

  if(typeof user.selectedToken == 'undefined') {
    return <div>Loading...</div>
  } else {
    return (
      <div id="app">
        <div>
          <Header
          user = {user}
          tokens = {tokens}
          dexContract = {dexContract}
          selectToken = {selectToken}
          />
        </div>
        
        <div>
          Main part
        </div>
      </div>
    );
  }
}

export default App;