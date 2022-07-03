import React, { useState, useEffect } from 'react';
import Header from './Header';
import Wallet from './Wallet';
import NewOrder from './NewOrder';

function App({ web3, account, dexContract, tokensContracts }) {
  /*
  console.log("Hello from the App component")
  console.log("web3 object: ", web3);
  console.log("account object: ", account);
  */
  //console.log("dexContract object: ", dexContract);
  //console.log("dexContract address: ", dexContract.options.address);
  //console.log("tokensContracts: ", tokensContracts);

  const [tokens, setTokens] = useState([]);
  const [user, setUser] = useState({
    account: undefined,
    balances: {
      tokenDex: 0,
      tokenWallet: 0
    },
    selectedToken: undefined
  })
  const[totalTokensInDex, setTotalTokensInDex] = useState(0);

  const selectToken = async(token) => {
    // Update the balances in the state variables
    const balances = await getBalances(user.account,token);
    setUser(user => ({...user, balances, selectedToken: token}));
    
    const totalTokensInDex = await getTotalTokensInDex(token);
    setTotalTokensInDex(totalTokensInDex);
    //setUser({ ...user, selectedToken: token })
  }

  const getTotalTokensInDex = async(token) => {
    let totalTokensInDex = await dexContract.methods.getTotalTokensInDex(web3.utils.fromAscii(token.symbol)).call();
    totalTokensInDex = web3.utils.fromWei(totalTokensInDex)
    console.log("Total tokens in the DEX Contract: ", totalTokensInDex);
    return totalTokensInDex;
  }

  const getBalances = async (account, token) => {
    console.log("Entro al getBalances()");
    let tokenDex = await dexContract.methods.tokenBalances(account, web3.utils.fromAscii(token.symbol)).call();
    let tokenWallet = await tokensContracts[token.symbol].methods.balanceOf(account).call();

    console.log("Account: :", account, " has, in the tokenDex: ", tokenDex)
    console.log("Account: :", account, " has, in the tokenWallet: ", tokenWallet)

    console.log("Token contract: ", tokensContracts[token.symbol].options.address)
    console.log("Token selected: ",  token.symbol)

    console.log("DEX Contract address:" , dexContract.options.address);

    tokenDex = web3.utils.fromWei(tokenDex)
    tokenWallet = web3.utils.fromWei(tokenWallet)

    return { tokenDex, tokenWallet };
  }

  // allow the user to send tokens from its Wallet to the DEX Contract
  const deposit = async(amount) => {
    console.log("Debugging the deposit function")
    //console.log(tokensContracts[user.selectedToken.symbol])
    await tokensContracts[user.selectedToken.symbol].methods.approve(dexContract.options.address,web3.utils.toWei(amount)).send({from: user.account});
    await dexContract.methods.deposit(web3.utils.fromAscii(user.selectedToken.symbol),web3.utils.toWei(amount)).send({from: user.account});

    // Update the balances in the state variables
    const balances = await getBalances(user.account,user.selectedToken);
    setUser(user => ({...user, balances}));

    const totalTokensInDex = await getTotalTokensInDex(user.selectedToken);
    setTotalTokensInDex(totalTokensInDex);
  }

  // allow the user to send tokens from the DEX Contract to its wallet
  const withdraw = async(amount) => {
    await dexContract.methods.withdraw(web3.utils.fromAscii(user.selectedToken.symbol), web3.utils.toWei(amount)).send({from: user.account});

    // Update the balances in the state variables
    const balances = await getBalances(user.account,user.selectedToken);
    setUser(user => ({...user, balances}));

    const totalTokensInDex = await getTotalTokensInDex(user.selectedToken);
    setTotalTokensInDex(totalTokensInDex);
  }

  const createMarketOrder = async(amount,side) => {
    await dexContract.methods.createMarketOrder(web3.utils.fromAscii(user.selectedToken.symbol),web3.utils.toWei(amount),side).send({ from: user.account});
  }

  const createLimitOrder = async(amount,price,side) => {
    await dexContract.methods.createLimitOrder(web3.utils.fromAscii(user.selectedToken.symbol),web3.utils.toWei(amount),price,side).send({ from: user.account});
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

      const balances = await getBalances(account,tokens[0]);
      setUser({
        account,
        balances,
        selectedToken: tokens[0]
      })

      const totalTokensInDex = await getTotalTokensInDex(tokens[0]);
      setTotalTokensInDex(totalTokensInDex);

    }
    init();
  }, [])

  if (typeof user.selectedToken == 'undefined') {
    return <div>Loading...</div>
  } else {
    return (
      <div id="app">
        <div>
          <Header
            user={user}
            tokens={tokens}
            dexContract={dexContract}
            selectToken={selectToken}
            totalTokensInDex={totalTokensInDex}
          />
        </div>

        <main className='container-fluid'>
          <div className='row'>
            <div className='col-sm-4 first-col'>
              <Wallet 
                user={user}
                deposit={deposit}
                withdraw={withdraw}
              />
              {user.selectedToken.symbol !== 'DAI' ? (
                <NewOrder 
                  createMarketOrder={createMarketOrder}
                  createLimitOrder={createLimitOrder}
                />
              ) : null}
            </div>
          </div>
        </main>


      </div>
    );
  }
}

export default App;