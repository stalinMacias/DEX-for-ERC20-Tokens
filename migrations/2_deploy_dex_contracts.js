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
    
  };
  