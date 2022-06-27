import React from 'react';
import { getWeb3, getAccount , getNetworkId, getDexContractInstance, getTokensContractInstances } from './utils';

function App() {
  const text = async () => {
    const web3 = await getWeb3();
    console.log(await getAccount())
    console.log(await getDexContractInstance(web3))
    console.log(await getTokensContractInstances(web3))
    return(
      <p> hello </p>
    )
  }

  return (
    <div>
      {text()}
    </div>

  );
}

export default App;
