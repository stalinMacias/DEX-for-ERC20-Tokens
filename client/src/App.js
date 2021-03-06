import React, { useState, useEffect } from 'react';
import Header from './Header';
import Wallet from './Wallet';
import NewOrder from './NewOrder';
import AllOrders from './AllOrders';
import MyOrders from './MyOrders';
import AllTrades from './AllTrades';

                            /*          *** TO-DO List ***
                              - Update the format of the amount variable that is retrieved from the Trade event
                                * The format is fetched in weis, but all the components are displaying ETHERS units.

                                - Create & Integrate Three new components
                                  * MyTrades component
                                    - Will display only the trades of the current user

                                  * MyDeposits component
                                    - Will display all the deposits that the current user has done

                                  * MyWithdraws component
                                    - Will display all the withdraws that the current user has done


                                        *** BUGs section ***
                                - Find & Fix a known bug when displaying the AllTrades component
                                  * Using the current logic, each time that the selected token is changed by the user, the trades state variables is cleaned up
                                    - When the trades state variable is cleaned up, all the trades of the previous seleted token are wiped out, and the trades variables is set to an empty array
                                    - The current approach to fetch events from the blockchain seems to only fetch new events, but not all the previous events that have already been emitted
                                    - Find a way to fetch all the previous emitted events and initialize the trades state variable using those values.
                                  * AllTrades component should display All the Trades that have been completed in the DEX, not only the new trades!
                            */

const SIDE = {
  BUY: 0,
  SELL: 1
}

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

  const [totalTokensInDex, setTotalTokensInDex] = useState(0);

  const [orders, setOrders] = useState({
    buy: [],
    sell: []
  })

  const [trades, setTrades] = useState([]);
  const [listener, setListener] = useState(undefined);

  const selectToken = async (token) => {
    const [balances,totalTokensInDex,orders] = await Promise.all([
      getBalances(user.account, token),
      getTotalTokensInDex(token),
      getOrders(token)
    ])

    // Update the state variables
    setUser(user => ({ ...user, balances, selectedToken: token }));
    setTotalTokensInDex(totalTokensInDex);
    setOrders(orders)

    // Pending: Check how to keep the trades of the other tokens or how to re-fetch all the previous events when changing the selected token
    // Read the bug section at the very beginning of this file !
    setTrades([]);
    listenToTrades(token)
    if(listener !== undefined) listener.unsubscribe();
  }

  const getTotalTokensInDex = async (token) => {
    let totalTokensInDex = await dexContract.methods.getTotalTokensInDex(web3.utils.fromAscii(token.symbol)).call();
    totalTokensInDex = web3.utils.fromWei(totalTokensInDex)
    console.log("Total tokens in the DEX Contract: ", totalTokensInDex);
    return totalTokensInDex;
  }

  const getBalances = async (account, token) => {
    let tokenDex = await dexContract.methods.tokenBalances(account, web3.utils.fromAscii(token.symbol)).call();
    let tokenWallet = await tokensContracts[token.symbol].methods.balanceOf(account).call();

    console.log("Token selected: ", token.symbol)
    //console.log("Account: :", account, " has, in the tokenDex: ", tokenDex)
    //console.log("Account: :", account, " has, in the tokenWallet: ", tokenWallet)
    //console.log("Token contract: ", tokensContracts[token.symbol].options.address)
    //console.log("DEX Contract address:", dexContract.options.address);

    tokenDex = web3.utils.fromWei(tokenDex)
    tokenWallet = web3.utils.fromWei(tokenWallet)

    return { tokenDex, tokenWallet };
  }

  // allow the user to send tokens from its Wallet to the DEX Contract
  const deposit = async (amount) => {
    console.log("Debugging the deposit function")
    //console.log(tokensContracts[user.selectedToken.symbol])
    await tokensContracts[user.selectedToken.symbol].methods.approve(dexContract.options.address, web3.utils.toWei(amount)).send({ from: user.account });
    await dexContract.methods.deposit(web3.utils.fromAscii(user.selectedToken.symbol), web3.utils.toWei(amount)).send({ from: user.account });

    // Update the balances in the state variables
    const balances = await getBalances(user.account, user.selectedToken);
    setUser(user => ({ ...user, balances }));

    const totalTokensInDex = await getTotalTokensInDex(user.selectedToken);
    setTotalTokensInDex(totalTokensInDex);
  }

  // allow the user to send tokens from the DEX Contract to its wallet
  const withdraw = async (amount) => {
    await dexContract.methods.withdraw(web3.utils.fromAscii(user.selectedToken.symbol), web3.utils.toWei(amount)).send({ from: user.account });

    // Update the balances in the state variables
    const balances = await getBalances(user.account, user.selectedToken);
    setUser(user => ({ ...user, balances }));

    const totalTokensInDex = await getTotalTokensInDex(user.selectedToken);
    setTotalTokensInDex(totalTokensInDex);
  }

  const createMarketOrder = async (amount, side) => {
    await dexContract.methods.createMarketOrder(web3.utils.fromAscii(user.selectedToken.symbol), web3.utils.toWei(amount), side).send({ from: user.account });
    const [balances,orders] = await Promise.all([
      getBalances(user.account, user.selectedToken),
      getOrders(user.selectedToken)
    ])
    setUser(user => ({ ...user, balances }));
    setOrders(orders)
    listenToTrades(user.selectedToken)
  }

  const createLimitOrder = async (amount, price, side) => {
    await dexContract.methods.createLimitOrder(web3.utils.fromAscii(user.selectedToken.symbol), web3.utils.toWei(amount), price, side).send({ from: user.account });
    const orders = await getOrders(user.selectedToken);
    setOrders(orders)
  }

  const getOrders = async (token) => {
    const orders = await Promise.all([
      dexContract.methods.getOrders(web3.utils.fromAscii(token.symbol), SIDE.BUY).call(),
      dexContract.methods.getOrders(web3.utils.fromAscii(token.symbol), SIDE.SELL).call()
    ])

    // Update the format of the amount parameter from wei units to ETHERs units 
    orders[0].map((order,i) => {
      orders[0][i]['amount'] = web3.utils.fromWei(order.amount)
      orders[0][i]['filled'] = web3.utils.fromWei(order.filled)
    })

    // Update the format of the amount parameter from wei units to ETHERs units 
    orders[1].map((order,i) => {
      orders[1][i]['amount'] = web3.utils.fromWei(order.amount)
      orders[1][i]['filled'] = web3.utils.fromWei(order.filled)
    })
    
    //console.log("orders after updating the amount to ETHERs unit from WEI units: ", orders[1]);

    return ({ buy: orders[0], sell: orders[1] })
  }
  
  const listenToTrades = async(token) => {
    console.log("Listening to trades for: ", token.symbol);
    const tradeIds = new Set();
    const listener = dexContract.events.Trade({
      filter: {tokenSymbol: web3.utils.fromAscii(token.symbol)},
      fromBlock: 0
    }).on('data', newTrade => {
      if(tradeIds.has(newTrade.returnValues.tradeId)) return null;
      tradeIds.add(newTrade.returnValues.tradeId);
      //console.log("New Trade :" , newTrade)
      setTrades(([...trades, newTrade.returnValues]))
      console.log("Trades: ", trades);
    })
    setListener(listener);
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

      listenToTrades(tokens[0])

      setTokens(tokens);

      const [balances,totalTokensInDex,orders] = await Promise.all([
        getBalances(account, tokens[0]),
        getTotalTokensInDex(tokens[0]),
        getOrders(tokens[0])
      ])

      setUser({
        account,
        balances,
        selectedToken: tokens[0]
      })
      setTotalTokensInDex(totalTokensInDex);
      setOrders(orders)
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
            {user.selectedToken.symbol !== 'DAI' ? (
              <div className="col-sm-8">
                <AllTrades
                  trades={trades}
                />
                <AllOrders 
                  orders={orders}
                />
                <MyOrders
                  orders={{
                    buy: orders.buy.filter(order => order.trader.toLowerCase() === user.account.toLowerCase()),
                    sell: orders.sell.filter(order => order.trader.toLowerCase() === user.account.toLowerCase()),
                  }}
                />
              </div>
            ) : null}
          </div>
        </main>


      </div>
    );
  }
}

export default App;