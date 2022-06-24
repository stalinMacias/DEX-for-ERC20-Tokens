const { expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

// Get the contract's artifacts of the ERC20 Tokens
const DAI = artifacts.require('DAI');
const HEMI = artifacts.require('HEMIDRACMA');
const TETRA = artifacts.require('TETRADRACMA');

const DEX = artifacts.require('DEX');

contract('DEX', (accounts) => {
    let dai,hemi,tetra,dex;
    let tokens;
    let daiSymbol, hemiSymbol, tetraSymbol;

    const [trader1,trader2] = [accounts[1],accounts[2]];
    const amount = web3.utils.toWei('1000','ether');

    // Seeding traders accounts with tokens & approving the DEX Contract to spend those tokens on behalf of the traders
    const seedTokenBalance = async (token,trader) => {
        await token.faucet(trader,amount, {from: trader});
        await token.approve(dex.address,amount, {from: trader});
    }

    beforeEach(async () => {
        // Creating multiple contracts instances at once and storing each instance in a single variable!
        ([dai,hemi,tetra] = await Promise.all([
            DAI.new(),
            HEMI.new(),
            TETRA.new()
        ]))

        // Create a new contract instance of the DEX Smart Contract!
        dex = await DEX.new();

        // Transform the token symbols string onto a valid bytes32 format that will be accepted by the Smart Contract
        [daiSymbol, hemiSymbol, tetraSymbol] = ['DAI','HEMI','TETRA'].map(symbol => web3.utils.fromAscii(symbol));

        // Add the DAI,HEMI & TETRA Tokens to the DEX contract as allowed tokens
        await Promise.all([
            dex.addToken(daiSymbol,dai.address),
            dex.addToken(hemiSymbol,hemi.address),
            dex.addToken(tetraSymbol,tetra.address)
        ])

        // Get the list of tokens
        tokens = await dex.getTokens()

        // seeding all tokens for trader1 account & approving DEX to spend those tokens on behalf of trader1
        await Promise.all(
            [dai,hemi,tetra].map(token => seedTokenBalance(token,trader1))
        );

        // seeding all tokens for trader2 account & approving DEX to spend those tokens on behalf of trader1
        await Promise.all(
            [dai,hemi,tetra].map(token => seedTokenBalance(token,trader2))
        );

    })

    // Validating if a token is an allowed token in the DEX Contract

    const allowedToken = (_token) => {
        let tokenInBytes = web3.utils.fromAscii(_token);
        //console.log(token," in bytes32 format: ", tokenInBytes)  
        for(token of tokens){
            if(token.symbol.includes(tokenInBytes)){
                console.log("The ",_token, " token was added correctly to the allowed tokens")
                return true;
            }
        }
        return false;
    }

    // Validate tokens are in the allowed token list
    it('Validate DAI Token was added correctly as an allowed token', () => {      
        assert(allowedToken('DAI') === true, "DAI Token was not added correctly to the allowed tokens in the DEX Contract");
    });

    it('Validate HEMI Token was added correctly as an allowed token', () => {
        assert(allowedToken('HEMI') === true, "HEMI Token was not added correctly to the allowed tokens in the DEX Contract");
    });

    it('Validate TETRA Token was added correctly as an allowed token', () => {
        assert(allowedToken('TETRA') === true, "TETRA Token was not added correctly to the allowed tokens in the DEX Contract");
    });

    // Validate DEX Contract has the correct allowance to spend tokens on behalf of the Traders
    const getAllowance = async (owner,spender) => {
        return await Promise.all(
            [dai,hemi,tetra].map(token => token.allowance(owner,spender))
        );
    }

    const validateAllowance = (tokenAllowance) => {
        if(web3.utils.fromWei(tokenAllowance,'ether') == web3.utils.fromWei(amount,'ether')) return true;
        return false;
    }

    const tokenName = (index) => {
        let token = ""
        if(index == 0) token = "DAI";
        else if(index == 1) token = "HEMI";
        else if(index == 2) token = "TETRA";
        else token = "Error, this token doesn't exist";

        return token;
    }

    // Validate that the DEX contract was granted the correct amount of tokens to spend on behalf of the traders accounts!
    it('Validate DEX Contract has the correct allowance for trader1 for all the tokens', async () => {
        [daiAllowance,hemiAllowance,tetraAllowance] = await getAllowance(trader1,dex.address);

        [daiAllowance,hemiAllowance,tetraAllowance].map((tokenAllowance,index) => {
            let validAllowance = false;
            (validateAllowance(tokenAllowance) == true) ? validAllowance = true : validAllowance = false;
            assert(validAllowance == true, 'DEX contract has not the correct allowance to spend: ', tokenName(index) ,' Tokens on behalf of Trader1');
        })
        /*
        assert(web3.utils.fromWei(daiAllowance,'ether') == web3.utils.fromWei(amount,'ether'), 'DEX contract has not the correct allowance to spend DAI Tokens on behalf of Trader1');
        assert(web3.utils.fromWei(hemiAllowance,'ether') == web3.utils.fromWei(amount,'ether'), 'DEX contract has not the correct allowance to spend HEMI Tokens on behalf of Trader1');
        assert(web3.utils.fromWei(tetraAllowance,'ether') == web3.utils.fromWei(amount,'ether'), 'DEX contract has not the correct allowance to spend TETRA Tokens on behalf of Trader1');
        */
    })

    // Validate that the DEX contract was granted the correct amount of tokens to spend on behalf of the traders accounts!
    it('Validate DEX Contract has the correct allowance for trader2 for all the tokens', async () => {
        [daiAllowance,hemiAllowance,tetraAllowance] = await getAllowance(trader2,dex.address);
        
        [daiAllowance,hemiAllowance,tetraAllowance].map((tokenAllowance,index) => {
            let validAllowance = false;
            (validateAllowance(tokenAllowance) == true) ? validAllowance = true : validAllowance = false;
            assert(validAllowance == true, 'DEX contract has not the correct allowance to spend: ', tokenName(index) ,' Tokens on behalf of Trader1');
        })
    })

    // test deposits
    const getAllTokenBalancesInExchange = async(trader) => {
        return await Promise.all(
            [daiSymbol, hemiSymbol, tetraSymbol].map((token) => dex.tokenBalances(trader,token))
        )
    }

    it('trader1 should deposit tokens into its account', async () => {
        const depositAmount = web3.utils.toWei('100','ether'); // 1000 tokens will be converted to weis
        // Deposit 100 token per each token into trader1 account 
        await dex.deposit(daiSymbol,depositAmount,{from: trader1});
        await dex.deposit(hemiSymbol,depositAmount,{from: trader1});
        await dex.deposit(tetraSymbol,depositAmount,{from: trader1});

        // Get the tokenBalances of all the tokens for trader1
        [daiBalance, hemiBalance, tetraBalance] = await getAllTokenBalancesInExchange(trader1);

        // Validate the tokenBalances of all the tokens for trader1 were updated correctly!
        [daiBalance, hemiBalance, tetraBalance].map((tokenBalance,index) => {
            console.log("Trader1 ", tokenName(index), " balance is: ", web3.utils.fromWei(tokenBalance,'ether'));
            let flag = false;
            (web3.utils.fromWei(tokenBalance,'ether') == web3.utils.fromWei(depositAmount,'ether')) ? flag = true : flag = false;
            assert(flag == true, 'Trader1 ', tokenName(index), ' balance is not equals as the deposited ammount');
        })
    })

    it('trader2 should deposit tokens into its account', async () => {
        const depositAmount = web3.utils.toWei('100','ether'); // 1000 tokens will be converted to weis
        // Deposit 100 token per each token into trader2 account 
        await dex.deposit(daiSymbol,depositAmount,{from: trader2});
        await dex.deposit(hemiSymbol,depositAmount,{from: trader2});
        await dex.deposit(tetraSymbol,depositAmount,{from: trader2});

        // Get the tokenBalances of all the tokens for trader2
        [daiBalance, hemiBalance, tetraBalance] = await getAllTokenBalancesInExchange(trader2);

        // Validate the tokenBalances of all the tokens for trader2 were updated correctly!
        [daiBalance, hemiBalance, tetraBalance].map((tokenBalance,index) => {
            console.log("Trader2 ", tokenName(index), " balance is: ", web3.utils.fromWei(tokenBalance,'ether'));
            let flag = false;
            (web3.utils.fromWei(tokenBalance,'ether') == web3.utils.fromWei(depositAmount,'ether')) ? flag = true : flag = false;
            assert(flag == true, 'Trader2 ', tokenName(index), ' balance is not equals as the deposited ammount');
        })
    })

    it('trying to deposit a non-allowed token, should fail', async () => {
        const depositAmount = web3.utils.toWei('100','ether'); // 1000 tokens will be converted to weis
        await expectRevert(
            dex.deposit(web3.utils.fromAscii('NON-VALID-TOKEN'),depositAmount,{from: trader1}),
            "The token is not an allowed token, contact the adminsitrator"
        )
    })

    it('Trying to deposit more DAI Tokens than the total allowance that the DEX contract is granted to spend on behalf of the trader 1 - Should fail', async () => {
        const depositAmount = web3.utils.toWei('10000','ether'); // 10000 tokens will be converted to weis
        await expectRevert(
            dex.deposit(daiSymbol,depositAmount,{from: trader1}),
            "ERC20: insufficient allowance"
        )
    })

    it("Trying to deposit more DAI Tokens than the total tokens that the trader1 owns - should fail", async () => {
        const depositAmount = web3.utils.toWei('1500','ether'); // 1500 tokens will be converted to weis
        // Increase the allowance over 2000k, so the DEX Contract can spend at most 2k tokens from the trader1, even though the trader1 only owns 1k tokens
        await dai.increaseAllowance(dex.address,web3.utils.toWei('500'),{from: trader1});

        // Trying to deposit 1500k from the trader1 into the DEX Contract - must fail
        await expectRevert(
            dex.deposit(daiSymbol,depositAmount,{from: trader1}),
            "ERC20: transfer amount exceeds balance"
        )
    })


    // Withdraws

    const getAllTokenBalancesInTokenContract = async(trader) => {
        return await Promise.all(
            [dai,hemi,tetra].map((token) => token.balanceOf(trader))
        )
    }

    it("Trying to withdraw all the tokenBalance available per each token - Trader1 - Success", async () => {
        const tokensAmount = web3.utils.toWei('1000','ether'); // 1000 tokens will be converted to weis

        // Deposit 100 token per each token into trader1 account in the DEX Contract
        await dex.deposit(daiSymbol,tokensAmount,{from: trader1});
        await dex.deposit(hemiSymbol,tokensAmount,{from: trader1});
        await dex.deposit(tetraSymbol,tokensAmount,{from: trader1});

        // Withdraw all the tokens from the DEX Contract into trader1 wallet
        await dex.withdraw(daiSymbol,tokensAmount,{from: trader1});
        await dex.withdraw(hemiSymbol,tokensAmount,{from: trader1});
        await dex.withdraw(tetraSymbol,tokensAmount,{from: trader1});

        // Get the tokenBalances of all the tokens for trader2
        let daiBalanceExchange,hemiBalanceExchange,tetraBalanceExchange;
        [daiBalanceExchange,hemiBalanceExchange,tetraBalanceExchange] = await getAllTokenBalancesInExchange(trader1);

        [daiBalanceExchange,hemiBalanceExchange,tetraBalanceExchange].map((balanceInExchange,index) => {
            const balance = web3.utils.fromWei(balanceInExchange,'ether');
            console.log("Token ", tokenName(index), "balance in DEX Contract: ", balance)
            // assert statement
            assert(balance == 0, 'The token balance in the DEX Contract is not correct, should be 0')
        })

        // Get the trader1 balance from the Token contract itself
        let daiBalanceUser,hemiBalanceUser,tetraBalanceUser;
        [daiBalanceUser,hemiBalanceUser,tetraBalanceUser] = await getAllTokenBalancesInTokenContract(trader1);

        [daiBalanceUser,hemiBalanceUser,tetraBalanceUser].map((balanceInTokenContract,index) => {
            console.log("Token ", tokenName(index), "balance in the Token Contract: ", web3.utils.fromWei(balanceInTokenContract,'ether'))
            // assert statement - both variables stores values in uint format!
            assert(balanceInTokenContract == tokensAmount, 'The token balance in the Token Contract is not correct')
        })
    })

    it("Trying to deposit in the DEX Contract a 100% of the tokens that Trader2 owns from the Token contract & then withdraw a 10% of the total tokens depositted in the DEX Contract", async () => {
        const withdrawAmount = web3.utils.toWei((web3.utils.fromWei(amount) *.10).toString()) // amount is a global variable that defines the total amount of tokens that will be minted in the beforeEeach() - 1000k tokens - amount is already in wei format!
        //console.log("withdrawAmount: ",withdrawAmount, typeof(withdrawAmount)); // Will be the 10% of the total minted tokens - 100 tokens
        //console.log("amount: " ,amount)

        await dex.deposit(daiSymbol,amount,{from: trader2});
        await dex.withdraw(daiSymbol,withdrawAmount,{from: trader2});
        
        const expectedBalanceInWwallet = web3.utils.fromWei(withdrawAmount);
        const balanceInWallet = await dai.balanceOf(trader2);
        assert(expectedBalanceInWwallet == web3.utils.fromWei(balanceInWallet), "Token balance in the Trader2 wallet is incorrect");

        const expectedBalanceInDEX = web3.utils.fromWei(amount) - web3.utils.fromWei(withdrawAmount);
        const balanceInDEX = await dex.tokenBalances(trader2,daiSymbol);
        assert(expectedBalanceInDEX == web3.utils.fromWei(balanceInDEX,'ether'), "Token balance in the DEX Contract is incorrect");
    })

    it("Trying to withdraw a token that doesn't exists - Should Fail", async () => {
        await expectRevert(
            dex.withdraw(web3.utils.fromAscii("NOT-A-VALID-TOKEN"),amount,{from: trader1}),
            "The token is not an allowed token, contact the adminsitrator"
        )
    })

    it("Trying to withdraw more tokens than the trader's balance in the DEX Contract - Should Fail", async () => {
        await dex.deposit(daiSymbol,amount,{from: trader1});
        const withdrawInvalidAmount = web3.utils.toWei('1500','ether');

        await expectRevert(
            dex.withdraw(daiSymbol,withdrawInvalidAmount,{from: trader1}),
            "Not enough balance, check that you have enough balance of the token that you are trying to withdraw"
        )
    })
      
    // Testing createLimitOrder()
    // Object that represents the OrderType enum
    const OrderType = {
        BUY : 0,
        SELL : 1
    }

    it("Trader1 is creating a limitOrder - createLimitOrder() - Should Succeed", async () => {
        // Depositting 1000k Dais
        await dex.deposit(daiSymbol,amount, {from: trader1});
        
        // Creating a limit order to BUY 10 HEMIs at a fixed price of 10 DAIs each HEMI
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),10,OrderType.BUY,{from: trader1});

        // Get the BUY orders[] for the HEMI Token
        const buyOrdersforHemi = await dex.getOrders(hemiSymbol,OrderType.BUY);

        //console.log("buyOrdersforHemi: ", buyOrdersforHemi);
        //console.log("HEMI token after padding its right: ", web3.utils.padRight(hemiSymbol,64));

        assert(buyOrdersforHemi[0].orderId == 0, "Incorrect Order ID for this limit order");
        assert(buyOrdersforHemi[0].trader == trader1, "The limit order was not creted by trader1");
        assert(buyOrdersforHemi[0].symbol == web3.utils.padRight(hemiSymbol,64), "The limit order was not created for the HEMI Token")
        assert(buyOrdersforHemi[0].amount == web3.utils.toWei('10'), "Incorrect amount of HEMI Tokens to buy");
        assert(buyOrdersforHemi[0].filled == 0, "Error when initializing the filled value, must be 0");
        assert(buyOrdersforHemi[0].price == 10, "Wrong price, must be 10");
    })

    it("Creating multiple BUY orders of different prices to validate that the orders[] array sorts the orders as expected!", async () => {
        console.log("The BUY Orders that are willing to pay the most go first");
    
        // Depositting 1000k Dais to trader1
        await dex.deposit(daiSymbol,amount, {from: trader1});

        // Depositting 1000k Dais to trader2
        await dex.deposit(daiSymbol,amount, {from: trader2});

        // trader1 creates a limit order to BUY 10 HEMIs at a fixed price of 10 DAIs each HEMI
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),10,OrderType.BUY,{from: trader1});

        // trader2 creates a limit order to BUY 10 HEMIs at a fixed price of 11 DAIs each HEMI
        // This order must be sorted up to the top of the orders[] array because it is a BUY Order and is the order that is paying the most
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),11,OrderType.BUY,{from: trader2});
        
        // trader2 creates a limit order to BUY 10 HEMIs at a fixed price of 5 DAIs each HEMI
        // This order must be sorted at the end of the orders[] array because it is a BUY Order and is the order that is paying the least
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),5,OrderType.BUY,{from: trader2});
        
        // Get the BUY orders[] for the HEMI Token
        const buyOrdersforHemi = await dex.getOrders(hemiSymbol,OrderType.BUY);

        console.log("buyOrdersforHemi: ", buyOrdersforHemi);

        // Validations related to the highest BUY order! 
        let orderIdOfHighestBuyOrder = buyOrdersforHemi[0].orderId;
        let priceOfHighestBuyOrder = buyOrdersforHemi[0].price
        let traderAddressHighestBuyOrder = buyOrdersforHemi[0].trader;
        assert(orderIdOfHighestBuyOrder == 1, "Error, the first order of the orders[] array must be the orderId of the order created by the trader2, which is the orderId: 1");
        assert(priceOfHighestBuyOrder == 11, "Error, the price set in the first order must be 11");
        assert(traderAddressHighestBuyOrder == trader2, "Error, the address acount of the first order must be the trader2");

        // Validations related to the lowest BUY order! 
        const lastOrder = buyOrdersforHemi.length -1;
        let orderIdOfLowestBuyOrder = buyOrdersforHemi[lastOrder].orderId;
        let priceOfLowestBuyOrder = buyOrdersforHemi[lastOrder].price
        let traderAddressLowestBuyOrder = buyOrdersforHemi[lastOrder].trader;
        assert(orderIdOfLowestBuyOrder == 2, "Error, the last order of the orders[] array must be the orderId of the order created by the trader2, which is the orderId: 2");
        assert(priceOfLowestBuyOrder == 5, "Error, the price set in the last order must be 5");
        assert(traderAddressLowestBuyOrder == trader2, "Error, the address acount of the last order must be the trader2");

        // Validate the position of all the BUY orders based on the orderId, must be --> 1,0,2 in that order
        let traderAddressSecondBuyOrder = buyOrdersforHemi[1].trader;
        assert(traderAddressSecondBuyOrder == trader1, "Error, the address acount of the order in the position 2 must be the trader1");
    })

    it("Creating multiple SELL orders of different prices of HEMI Token to validate that the orders[] array sorts the orders as expected!", async () => {
        console.log("The SELL Orders that sell their tokens the cheapest go first");

        // Depositting 1000k HEMIs to trader1
        await dex.deposit(hemiSymbol,amount, {from: trader1});

        // Depositting 1000k HEMIs to trader2
        await dex.deposit(hemiSymbol,amount, {from: trader2});

        // trader1 creates a limit order to SELL 10 HEMIs at a fixed price of 10 DAIs each HEMI - Should be the second order
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),10,OrderType.SELL,{from: trader1});

        // trader2 creates a limit order to SELL 10 HEMIs at a fixed price of 11 DAIs each HEMI - Should be the last order
        // This order must be sorted up to the top of the orders[] array because it is a SELL Order and is the order that is paying the most
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),11,OrderType.SELL,{from: trader2});
        
        // trader2 creates a limit order to SELL 10 HEMIs at a fixed price of 5 DAIs each HEMI - Should be the first order
        // This order must be sorted at the end of the orders[] array because it is a SELL Order and is the order that is paying the least
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),5,OrderType.SELL,{from: trader2});
        
        // Get the SELL Orders for the HEMI Token
        const sellOrdersforHemi = await dex.getOrders(hemiSymbol,OrderType.SELL);

        console.log("sellOrdersforHemi: ", sellOrdersforHemi);

        // Validations related to the highest SELL order! 
        let orderIdOfHighestSellOrder = sellOrdersforHemi[0].orderId;
        let priceOfHighestSellOrder = sellOrdersforHemi[0].price
        let traderAddressHighestSellOrder = sellOrdersforHemi[0].trader;
        assert(orderIdOfHighestSellOrder == 2, "Error, the first order of the SELL orders[] array must be the orderId of the order created by the trader2 with a price of 5, which is the orderId: 2");
        assert(priceOfHighestSellOrder == 5, "Error, the price set in the first SELL order must be 11");
        assert(traderAddressHighestSellOrder == trader2, "Error, the address acount of the first SELL order must be the trader2");

        // Validations related to the Lowest SELL order! 
        const lastSellOrder = sellOrdersforHemi.length - 1;
        let orderIdOfLowestSellOrder = sellOrdersforHemi[lastSellOrder].orderId;
        let priceOfLowestSellOrder = sellOrdersforHemi[lastSellOrder].price
        let traderAddressLowestSellOrder = sellOrdersforHemi[lastSellOrder].trader;
        assert(orderIdOfLowestSellOrder == 1, "Error, the last order of the SELL orders[] array must be the orderId of the order created by the trader2 with a price of 5, which is the orderId: 1");
        assert(priceOfLowestSellOrder == 11, "Error, the price set in the last SELL order must be 11");
        assert(traderAddressLowestSellOrder == trader2, "Error, the trader's address of the last SELL order must be the trader2");

        // Validate the position of all the SELL orders based on the orderId, must be --> 2,0,1 in that order
        let secondTraderAddressSellOrder = sellOrdersforHemi[1].trader;
        assert(secondTraderAddressSellOrder == trader1, "Error, the address acount of the order in the position 2 must be the trader1");
    })

    // Unhappy paths to test the expected erros when creating limit orders

    it("Test to create a limit order trying to trade a token that is not allowed/doesn't exist in the DEX Contract", async () => {
        await expectRevert(
            dex.createLimitOrder(web3.utils.fromAscii('NOT-A-VALID-TOKEN'), web3.utils.toWei('10'), 10,OrderType.SELL,{from: trader1}),
            "The token is not an allowed token, contact the adminsitrator"
        )
    })

    it("Test to create a limit order to trade the DAI Token", async () => {
        console.log("The DAI Token can't be traded, it can only be used to pay")

        await expectRevert(
            dex.createLimitOrder(daiSymbol,web3.utils.toWei('10'),10,OrderType.SELL,{from: trader1}),
            "DAI Token can't be traded, reverting operation"
        )
    })

    it("Test to create a SELL limit order trying to trade more tokens than the total tokenBalance that the trader holds", async () => {
        // Depositting 1000k HEMIs to trader1
        await dex.deposit(hemiSymbol,amount, {from: trader1});

        await expectRevert(
            // Trying to create a SELL Order of 10k HEMIs
            dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10000'),10,OrderType.SELL,{from: trader1}),
            "There is not enough Tokens in the balance to create a SELL Order"
        )
    })

    it("Test to create a BUY order trying to offer more DAIs than the total DAI tokenBalance that the trader holds", async () => {
        // Depositting 1000k DAIs to trader1
        await dex.deposit(daiSymbol,amount, {from: trader1});

        await expectRevert(
            dex.createLimitOrder(hemiSymbol,web3.utils.toWei('1000'),10,OrderType.BUY,{from: trader1}),
            "There is not enough DAI Tokens in the balance to create a BUY Order"
        )
    })

    // Tests to validate the createMarketOrder() to create BUY Market Orders!
    it("Create two BUY Market Order that will match different orders from the SELL Orader from the Order Book" , async () => {
        await dex.deposit(daiSymbol,amount,{from: trader1});
        await dex.deposit(hemiSymbol,amount,{from: trader2});

        // Trader2 creates a SELL limit order to sell 100 HEMI tokens at a fixed price of 5 DAIs each HEMI
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('100'),5,OrderType.SELL,{from: trader2});

        // Trader1 creates a BUY market order to BUY 50 HEMIs
        await dex.createMarketOrder(hemiSymbol,web3.utils.toWei('50'),OrderType.BUY,{from: trader1});

        let sellOrdersHemiToken = await dex.getOrders(hemiSymbol,OrderType.SELL);
        //console.log("sellOrdersHemiToken[] after completing the first market order - ", sellOrdersHemiToken);

        // Validate the filled field of the limit order was updated properly based on the number of tokens that were taken by the Market Order
        assert(sellOrdersHemiToken[0].filled == web3.utils.toWei('50'), "The limit order was not updated correctly after filling the Market Order");

        // Validating trader1 balances after completing the first market order
        let trader1HEMIBalance = await dex.tokenBalances(trader1,hemiSymbol);
        let trader1DAIBalance = await dex.tokenBalances(trader1,daiSymbol);
        //console.log("trader1DAIBalance: " , web3.utils.fromWei(trader1DAIBalance));

        assert(trader1HEMIBalance == web3.utils.toWei('50'), "Incorrect HEMI Balance for trader1, should be 50 because it bought 50 Hemis in the Market Order");
        assert(trader1DAIBalance == web3.utils.toWei('750'), "Incorrect DAI Balance for trader1, should be 750 because in the Market Order paid 50 Dais for 50 HEMIs at a price of 5 DAIs each HEMI")

        // Validating trader2 balances after completing the first market order
        let trader2Balances = await Promise.all([
            dex.tokenBalances(trader2,hemiSymbol),
            dex.tokenBalances(trader2,daiSymbol)
        ])

        assert(trader2Balances[0] == web3.utils.toWei('950'), "Incorrect HEMI Balance for trader2, should be 950 because it sold 50 Hemis in the Limit Order");
        assert(trader2Balances[1] == web3.utils.toWei('250'), "Incorrect DAI Balance for trader2, should be 250 because when the Market Order from trader1 was completes, trader2 received 250 Dais for selling 50 Hemis at a price of 5 Dais per each HEMI")

        // Trader2 creates a SELL limit order to sell 100 HEMI tokens at a fixed price of 5 DAIs each HEMI
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),1,OrderType.SELL,{from: trader2});

        sellOrdersHemiToken = await dex.getOrders(hemiSymbol,OrderType.SELL);
        //console.log("sellOrdersHemiToken[] before completing the second market order - ", sellOrdersHemiToken);
        
        // Taking the rest of the liquidity of the SELL Limit Order
        
        // Trader1 creates a BUY market order to BUY 50 HEMIs - Take all the rest of the liquidity
        await dex.createMarketOrder(hemiSymbol,web3.utils.toWei('50'),OrderType.BUY,{from: trader1});

        sellOrdersHemiToken = await dex.getOrders(hemiSymbol,OrderType.SELL);
        //console.log("sellOrdersHemiToken[] after completing the second market order - ", sellOrdersHemiToken);

        // Validate that the alghoritm tto clean up orders that have been totally filled from the Order Book works
        assert(sellOrdersHemiToken.length == 1, "Error, the sell orders[] array should have only 1 order, one of the two orders was already completed!")
        
        // Validate that the second Market Order took some liquidity from the orders that is still in the orders[] array
        assert(sellOrdersHemiToken[0].filled == web3.utils.toWei('90'), "The filled parameter should be equals to 90, the first market order took 50 tokens and the second market order should have took 40 from this limit order");

        // Validating trader2 balances after completing all the Market Orders
        trader2Balances = await Promise.all([
            dex.tokenBalances(trader2,hemiSymbol),
            dex.tokenBalances(trader2,daiSymbol)
        ])

        assert(trader2Balances[0] == web3.utils.toWei('900'), "Incorrect HEMI Balance for trader2, should be 900 after filling the two market orders created by trader2");
        assert(trader2Balances[1] == web3.utils.toWei('460'), "Incorrect DAI Balance for trader2, should be 460 after filling the two market orders created by trader2")

        // Validating trader1 balances after completing all the Market Orders
        let trader1Balances = await Promise.all([
            dex.tokenBalances(trader1,hemiSymbol),
            dex.tokenBalances(trader1,daiSymbol)
        ])

        assert(trader1Balances[0] == web3.utils.toWei('100'), "Incorrect HEMI Balance for trader1, should be 100 after its two market orders were filled");
        assert(trader1Balances[1] == web3.utils.toWei('540'), "Incorrect DAI Balance for trader1, should be 540 after buying 100 HEMIs")
    })

    // Tests to validate the createMarketOrder() to create SELL Market Orders!
    it("Create two SELL Market Order that will match different orders from the BUY Order from the Order Book" , async () => {
        await dex.deposit(hemiSymbol,amount,{from: trader1});
        await dex.deposit(daiSymbol,amount,{from: trader2});

        // Trader2 creates the first limit order to BUY 50 HEMI Tokens at a fixed price of 10 DAIs per each HEMI
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('50'),10,OrderType.BUY,{from: trader2});

        // Trader1 creates the first market order to SELL 100 HEMI Tokens
        await dex.createMarketOrder(hemiSymbol,web3.utils.toWei('100'),OrderType.SELL,{from: trader1});

        // Validate trader balances after executing the first market order
        let trader1Balances = await Promise.all([
            dex.tokenBalances(trader1,hemiSymbol),
            dex.tokenBalances(trader1,daiSymbol)
        ])

        assert(trader1Balances[0] == web3.utils.toWei('950'), "The balance of HEMI Tokens for trader1 must be 950 HEMIs after its SELL Order was filled by trader2")
        assert(trader1Balances[1] == web3.utils.toWei('500'), "The balance of DAI Tokens for trader1 must be 500 DAIs, because it sold 50 HEMIs at a price of 10 DAIs each hemi")

        let trader2Balances = await Promise.all([
            dex.tokenBalances(trader2,hemiSymbol),
            dex.tokenBalances(trader2,daiSymbol)
        ])

        assert(trader2Balances[0] == web3.utils.toWei('50'), "The balance of HEMI Tokens for trader2 must be 50 HEMIs after taking all the available liquidity from the SELL orders[]")
        assert(trader2Balances[1] == web3.utils.toWei('500'), "The balance of DAI Tokens for trader2 must be 500 DAIs after selling 50 Hemis at a price of 10 DAIs each HEMI")
        
        // Trader2 creates the second limit order to BUY 10 HEMI Tokens at a fixed price of 20 DAIs per each HEMI
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('10'),20,OrderType.BUY,{from: trader2});

         // Trader2 creates the third limit order to BUY 100 HEMI Tokens at a fixed price of 10 DAIs per each HEMI
         await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('100'),1,OrderType.BUY,{from: trader2});

        // Trader1 creates the second market order to SELL 50 HEMI Tokens
        await dex.createMarketOrder(hemiSymbol,web3.utils.toWei('50'),OrderType.SELL,{from: trader1});

        // Validate traders balances after all the market orders were executed
        trader1Balances = await Promise.all([
            dex.tokenBalances(trader1,hemiSymbol),
            dex.tokenBalances(trader1,daiSymbol)
        ])

        assert(trader1Balances[0] == web3.utils.toWei('900'), "After completing all the market orders, the trader1 should have 900 HEMIs in its balance, only 100 HEMIs were sold")
        assert(trader1Balances[1] == web3.utils.toWei('740'), "Trader1 should have collected 740 DAIs after filling the two market orders from trader1")

        trader2Balances = await Promise.all([
            dex.tokenBalances(trader2,hemiSymbol),
            dex.tokenBalances(trader2,daiSymbol)
        ])

        assert(trader2Balances[0] == web3.utils.toWei('100'), "After completing all the market orders, the trader2 should have 100 HEMIs, in the first order should bought 50, and in the second market order another 50")
        assert(trader2Balances[1] == web3.utils.toWei('260'), "trader2 should have only 260 DAIs remaining in its balance after buying 100 HEMIs")

        let sellOrdersHemiToken = await dex.getOrders(hemiSymbol,OrderType.SELL);
        let buyOrdersHemiToken = await dex.getOrders(hemiSymbol,OrderType.BUY);

        console.log("sellOrdersHemiToken: " ,sellOrdersHemiToken);
        console.log("buyOrdersHemiToken: ", buyOrdersHemiToken);

        // Validate the remaining orders in the BUY Order Book
        // should be only 1 order with a value in the filled parameter of 40
        assert(buyOrdersHemiToken.length == 1, "After completing all the Market Orders, only 1 BUY Order should remain in the BUY orders[]")
        assert(buyOrdersHemiToken[0].filled == web3.utils.toWei('40'), "From the only remaining BUY Order were taken 40 HEMI tokens to fill the second market order, filled parameter must be 40")
    })

    // Test all the possible errors when creating Market Orders
    it("Test if the number of tokens to sell/buy are valid (Must be greater than 0)", async () => {
        await expectRevert(
            dex.createMarketOrder(hemiSymbol,web3.utils.toWei('0'),OrderType.BUY,{from: trader1}),
            "The number of tokens to trade must be greater than 0"
        )
    })

    it("Test  if the token to trade is an allowed token in the DEX Contract", async () => {
        await expectRevert(
            dex.createMarketOrder(web3.utils.fromAscii('NOT-AN-ALLOWED-TOKEN'),web3.utils.toWei('10'),OrderType.BUY,{from: trader2}),
            "The token is not an allowed token, contact the adminsitrator"
        )
    })

    it("Test that the token to trade is not the DAI Token", async () => {
        await expectRevert(
            dex.createMarketOrder(daiSymbol,web3.utils.toWei('10'),OrderType.BUY,{from: trader1}),
            "DAI Token can't be traded, reverting operation"
        )
    })

    it("When the market order is a SELL Order, test that the  amount doesn't exceed the trader's tokenBalances for that token", async () => {
        await dex.deposit(hemiSymbol,amount,{from: trader1})

        // Trying to create a SELL Market Order for the HEMI Token of 10k tokens
        await expectRevert(
            dex.createMarketOrder(hemiSymbol,web3.utils.toWei('10000'),OrderType.SELL,{from: trader1}),
            "There is not enough Tokens in your balance, deposit more"
        )
    })

    it("When the market order is a BUY Order, test that the trader has enough DAI Balance to pay the total price for its order" , async () => {
        await dex.deposit(hemiSymbol,amount,{from: trader1})

        // Create a SELL Limit Order that will be added to the Order Book
        await dex.createLimitOrder(hemiSymbol,web3.utils.toWei('100'), 10, OrderType.SELL, {from: trader1})

        // trader2 will try to create a Market Order to buy 50 HEMIs that are been sold at 10 DAIs each HEMI; But the trader2 doesn't have any DAIs in its balance
        await expectRevert(
            dex.createMarketOrder(hemiSymbol,web3.utils.toWei('50'),OrderType.BUY,{from: trader2}),
            "The user does not have enough DAI to buy the requested amount of tokens"
        )
    })
})