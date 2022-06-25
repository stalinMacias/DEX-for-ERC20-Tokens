// contract's artifacts
const daiArtifact = artifacts.require("DAI");
const hemiArtifact = artifacts.require("HEMIDRACMA");
const tetraArtifact = artifacts.require("TETRADRACMA");
const dexArtifact = artifacts.require("DEX");

// Convert the token's symbol to bytes32 format
const [daiSymbol, hemiSymbol, tetraSymbol] = ['DAI','HEMI','TETRA'].map(symbol => web3.utils.fromAscii(symbol))

module.exports = async function(deployer) {
    // Deploy all the contract's artifacts at once
    await Promise.all(
        [daiArtifact,hemiArtifact,tetraArtifact,dexArtifact].map(contract => deployer.deploy(contract))
    )

    // Create a contract instance of each deployed contract
    const [daiContract, hemiContract, tetraContract, dexContract] = await Promise.all(
        [daiArtifact,hemiArtifact,tetraArtifact,dexArtifact].map(contract => contract.deployed())
    )

    // Add the DAI, HEMI & TETRA Token to the allowed list of tokens to trade in the DEX Contract
    await Promise.all([
        dexContract.addToken(daiSymbol,daiContract.address),
        dexContract.addToken(hemiSymbol,hemiContract.address),
        dexContract.addToken(tetraSymbol,tetraContract.address)
    ])

    // Allocating initial tokens to the trader's accounts

    const accounts = await web3.eth.getAccounts();
    const [admin,trader1,trader2,trader3,trader4] = [accounts[0],accounts[1],accounts[2],accounts[3],accounts[4]]

    const amount = web3.utils.toWei('1000');

    const seedTokenBalance = async (token,trader) => {
        await token.faucet(trader,amount,{from:trader});
        await token.approve(dexContract.address,amount,{from:trader});
        const tokenSymbol = await token.symbol();
        await dexContract.deposit(web3.utils.fromAscii(tokenSymbol),amount,{from:trader})
        
        //const tokenBalance = await dexContract.tokenBalances(trader1,web3.utils.fromAscii(tokenSymbol))
        //console.log("Token Balancess: ", web3.utils.fromWei(tokenBalance));
    }

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

    // Seeding trader4
    await Promise.all(
        [daiContract, hemiContract, tetraContract].map(token => seedTokenBalance(token,trader4))
    );

    
    //

    
  };
  