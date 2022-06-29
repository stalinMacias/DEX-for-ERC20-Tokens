import React from "react";
import Dropdown from "./Dropdown";

function Header({user,tokens,dexContract,selectToken}) {
    return(
        <header id="header" className="card">
            <div className="row">
                <div className="col-sm-3 flex">
                    <Dropdown
                        items = {tokens.map(token => ({
                            label: token.symbol,
                            value: token
                        }))}
                        activeItem={{
                            label: user.selectedToken.symbol,
                            value: user.selectedToken
                        }} 
                        onSelect={selectToken} 
                    />
                </div>
                <div className="col-sm-9">
                    <h1 className="header-title">
                        Dex - <span className="contract-address">Contract Address: </span> <span className="address">{dexContract.options.address}</span>
                    </h1 >
                    <h1 className="header-title">
                        <span className="contract-address">{user.selectedToken.symbol} token address: </span> <span className="address">{user.selectedToken.tokenAddress}</span>
                    </h1>
                </div>
            </div>
        </header>
    )
}

export default Header;