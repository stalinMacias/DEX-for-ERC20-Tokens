import React from 'react';

function App({web3,account,dexContract,tokensContracts}) {
  /*
  console.log("Hello from the App component")
  console.log("web3 object: ", web3);
  console.log("account object: ", account);
  */
  console.log("dexContract object: ", dexContract);
  console.log("dexContract address: ", dexContract.options.address);
  //console.log("tokensContracts: ", tokensContracts);

  return (
    <div>
    </div>

  );
}

export default App;