// contract's artifacts
const daiArtifact = artifacts.require("DAI");
const hemiArtifact = artifacts.require("HEMIDRACMA");
const tetraArtifact = artifacts.require("TETRADRACMA");
const dexArtifact = artifacts.require("DEX");

// Convert the token's symbol to bytes32 format
const [daiSymbol, hemiSymbol, tetraSymbol] = ['DAI','HEMI','TETRA'].map(symbol => web3.utils.fromAscii(symbol))

module.exports = async function(deployer) {
    const accounts = await web3.eth.getAccounts();
    // Deploy the contract to the blockchain
    console.log(accounts)
    
    // Deploy all the contract's artifacts at once
    /*
    await Promise.all(
        //[daiArtifact,hemiArtifact,tetraArtifact,dexArtifact].map(contract => deployer.deploy(contract))
        [daiArtifact,hemiArtifact,tetraArtifact].map(contract => deployer.deploy(contract))
    )
    */
    await deployer.deploy(daiArtifact)
    await deployer.deploy(hemiArtifact)
    await deployer.deploy(tetraArtifact)
    await deployer.deploy(dexArtifact)

    const daiContract = await daiArtifact.deployed()
    const hemiContract = await hemiArtifact.deployed()
    const tetraContract = await tetraArtifact.deployed()
    const dexContract = await dexArtifact.deployed()

    /*
    // Create a contract instance of each deployed contract
    const [daiContract, hemiContract, tetraContract, dexContract] = await Promise.all(
        [daiArtifact,hemiArtifact,tetraArtifact,dexArtifact].map(contract => contract.deployed())
        //[daiArtifact,hemiArtifact,tetraArtifact].map(contract => contract.deployed())
    )
    */

    await dexContract.addToken(daiSymbol,daiContract.address)
    await dexContract.addToken(hemiSymbol,hemiContract.address)
    await dexContract.addToken(tetraSymbol,tetraContract.address)
    
    /*
    // Add the DAI, HEMI & TETRA Token to the allowed list of tokens to trade in the DEX Contract
    await Promise.all([
        dexContract.addToken(daiSymbol,daiContract.address),
        dexContract.addToken(hemiSymbol,hemiContract.address),
        dexContract.addToken(tetraSymbol,tetraContract.address)
    ])
    */

    // Allocating initial tokens to the trader's accounts
    //const accounts = await web3.eth.getAccounts();


    const [admin,trader1,trader2,trader3] = [accounts[0],accounts[1],accounts[2],accounts[3]]

    const amount = web3.utils.toWei('1000');

    const seedTokenBalance = async (token,trader) => {
        await token.faucet(trader,amount,{from:trader});
        await token.approve(dexContract.address,amount,{from:trader});
        const tokenSymbol = await token.symbol();
        await dexContract.deposit(web3.utils.fromAscii(tokenSymbol),amount,{from:trader})
        
        const tokenBalance = await dexContract.tokenBalances(trader,web3.utils.fromAscii(tokenSymbol))
        console.log("Token ", tokenSymbol, " balance for: " ,trader ," are: ", web3.utils.fromWei(tokenBalance));
    }

    // Seeding trader1
    await seedTokenBalance(daiContract,trader1)
    await seedTokenBalance(hemiContract,trader1)
    await seedTokenBalance(tetraContract,trader1)

    // Seeding trader2
    await seedTokenBalance(daiContract,trader2)
    await seedTokenBalance(hemiContract,trader2)
    await seedTokenBalance(tetraContract,trader2)
    
    // Seeding trader3
    await seedTokenBalance(daiContract,trader3)
    await seedTokenBalance(hemiContract,trader3)
    await seedTokenBalance(tetraContract,trader3)


    /*
    // Seeding trader1
    await Promise.all(
        [daiContract, hemiContract, tetraContract].map(token => seedTokenBalance(token,trader1))
    );

    // Seeding trader2
    await Promise.all(
        [daiContract, hemiContract, tetraContract].map(token => seedTokenBalance(token,trader2))
    );

    // Seeding trader3
    await Promise.all(
        [daiContract, hemiContract, tetraContract].map(token => seedTokenBalance(token,trader3))
    );
  */
    /*
    // Seeding Orders
    const increaseTime = async (seconds) => {
        await web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [seconds],
            id: 0,
        }, () => {});
    }
    */
    // Creating trades


    const OrderType = {
        BUY : 0,
        SELL : 1
    }

    // initially, each Trader has 1k of each Token 
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),5,OrderType.SELL, {from: trader2})
    await dexContract.createMarketOrder(hemiSymbol,web3.utils.toWei('10'),OrderType.BUY, {from: trader1})
    //increaseTime(1);

    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('5'),10,OrderType.SELL, {from: trader1})
    await dexContract.createMarketOrder(hemiSymbol,web3.utils.toWei('5'),OrderType.BUY, {from: trader3})
    //increaseTime(1);

    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('7'),8,OrderType.SELL, {from: trader3})
    await dexContract.createMarketOrder(hemiSymbol,web3.utils.toWei('7'),OrderType.BUY, {from: trader2})
    //increaseTime(1);

    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('15'),12,OrderType.SELL, {from: trader3})
    await dexContract.createMarketOrder(hemiSymbol,web3.utils.toWei('15'),OrderType.BUY, {from: trader1})
    //increaseTime(1);

    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('3'),15,OrderType.SELL, {from: trader1})
    await dexContract.createMarketOrder(tetraSymbol,web3.utils.toWei('3'),OrderType.BUY, {from: trader3})
    //increaseTime(1);

    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('20'),9,OrderType.SELL, {from: trader2})
    await dexContract.createMarketOrder(tetraSymbol,web3.utils.toWei('20'),OrderType.BUY, {from: trader3})
    //increaseTime(1);

    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('10'),20,OrderType.SELL, {from: trader1})
    await dexContract.createMarketOrder(tetraSymbol,web3.utils.toWei('10'),OrderType.BUY, {from: trader3})
    //increaseTime(1);

    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('50'),5,OrderType.SELL, {from: trader3})
    await dexContract.createMarketOrder(tetraSymbol,web3.utils.toWei('50'),OrderType.BUY, {from: trader1})
    //increaseTime(1);

    // Creating limit orders to fill up the Order Book
    // SELL Limit Orders for HEMI Token
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),10,OrderType.SELL, {from: trader1})
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('5'),5,OrderType.SELL, {from: trader2})
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('15'),25,OrderType.SELL, {from: trader3})
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('25'),5,OrderType.SELL, {from: trader2})

    // BUY Limit Orders for HEMI Token
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('5'),10,OrderType.BUY, {from: trader3})
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('15'),5,OrderType.BUY, {from: trader1})
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('15'),20,OrderType.BUY, {from: trader2})
    await dexContract.createLimitOrder(hemiSymbol,web3.utils.toWei('15'),15,OrderType.BUY, {from: trader1})

    // SELL Limit Orders for TETRA Token
    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('10'),10,OrderType.SELL, {from: trader1})
    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('5'),5,OrderType.SELL, {from: trader2})
    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('15'),25,OrderType.SELL, {from: trader3})
    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('25'),5,OrderType.SELL, {from: trader2})

    // BUY Limit Orders for TETRA Token
    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('5'),10,OrderType.BUY, {from: trader1})
    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('15'),5,OrderType.BUY, {from: trader3})
    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('15'),20,OrderType.BUY, {from: trader2})
    await dexContract.createLimitOrder(tetraSymbol,web3.utils.toWei('15'),15,OrderType.BUY, {from: trader1})

    /*
    const sellLimitOrdersHemi = await dexContract.getOrders(hemiSymbol,OrderType.SELL);
    const buyLimitOrdersHemi = await dexContract.getOrders(hemiSymbol,OrderType.BUY);

    const sellLimitOrdersTetra = await dexContract.getOrders(tetraSymbol,OrderType.SELL);
    const buyLimitOrdersTetra = await dexContract.getOrders(tetraSymbol,OrderType.BUY);

    
    console.log("sellLimitOrdersHemi :",sellLimitOrdersHemi)
    console.log("buyLimitOrdersHemi :",buyLimitOrdersHemi)
    console.log("sellLimitOrdersTetra :",sellLimitOrdersTetra)
    console.log("buyLimitOrdersTetra :",buyLimitOrdersTetra)
    */
    
  };
  