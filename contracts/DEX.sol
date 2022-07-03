// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract DEX {

    using SafeMath for uint256;

    struct Token {
        bytes32 symbol;
        address tokenAddress;
    }

    mapping(bytes32 => Token) tokens;   // This mapping will map the token's symbol to a Token struct instance
    bytes32[] public tokenList;         // Using this tokenList will allow us to know the allowed tokens

    mapping(address => mapping(bytes32 => uint)) public tokenBalances; // This nested mapping will allow us to know how many tokens of what token a user holds in the DEX's contract

    enum OrderType {
        BUY,
        SELL
    }

    struct Order {
        uint orderId;
        OrderType orderType;
        address trader;
        bytes32 symbol;
        uint amount;
        uint filled;
        uint price;
        uint date;
    }

    mapping(bytes32 => mapping(OrderType => Order[])) public orderBook;

    uint nextOrderId;
    bytes32 constant DAI = bytes32("DAI");

    address public admin;

    event Trade(
        uint indexed tradeId, 
        uint orderId, 
        bytes32 tokenSymbol, 
        OrderType _orderType, 
        address indexed userInitiator, 
        address indexed userFill, 
        uint tokenAmount, 
        uint pricePerToken, 
        uint totalCost, 
        uint timestamp
    );

    uint public nextTradeId;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(admin == msg.sender, "Only the admin can call this function!");
        _;
    }

    modifier validAmount(uint _amount) {
        require(_amount > 0, "The number of tokens to trade must be greater than 0");
        _;
    }

    modifier onlyAllowedTokens(bytes32 _symbol) {
        // check in the tokens mapping if the _symbol is a valid token by validating if the tokenAddress of the _symbol is different than the 0 address
        // If the _symbol address in the tokens mappings is equals to the 0 address it means that that token is not an allowed token
        require(tokens[_symbol].tokenAddress != address(0), "The token is not an allowed token, contact the adminsitrator");
        _;
    }

    modifier tokenIsNotDai(bytes32 _symbol) {
        require(_symbol != DAI, "DAI Token can't be traded, reverting operation");
        _;
    }

    function addToken(bytes32 _symbol, address _tokenAddress) external onlyAdmin() {
        tokens[_symbol] = Token(_symbol,_tokenAddress);
        tokenList.push(_symbol);
    }

    function deposit(bytes32 _symbol, uint _amount) external onlyAllowedTokens(_symbol) {
        IERC20(tokens[_symbol].tokenAddress).transferFrom(msg.sender, address(this), _amount);
        tokenBalances[msg.sender][_symbol] = tokenBalances[msg.sender][_symbol].add(_amount);

        // Update the total DEX Balance of tokens when a user Deposits tokens
        tokenBalances[address(this)][_symbol] = tokenBalances[address(this)][_symbol].add(_amount);
    }

    function withdraw(bytes32 _symbol, uint _amount) external onlyAllowedTokens(_symbol) {
        require(_amount <= tokenBalances[msg.sender][_symbol] , "Not enough balance, check that you have enough balance of the token that you are trying to withdraw");
        // Uodate user's token balance before transfering the tokens - Prevent reentrancy attacks
        tokenBalances[msg.sender][_symbol] = tokenBalances[msg.sender][_symbol].sub(_amount);
        IERC20(tokens[_symbol].tokenAddress).transfer(msg.sender,_amount);

        // Update the total DEX Balance of tokens when a user Withdraws tokens
        tokenBalances[address(this)][_symbol] = tokenBalances[address(this)][_symbol].sub(_amount);
    }

    function createLimitOrder(bytes32 _symbol, uint _amount, uint _price, OrderType _orderType) external validAmount(_amount) onlyAllowedTokens(_symbol) tokenIsNotDai(_symbol) {
        if(_orderType == OrderType.SELL) {
            require(tokenBalances[msg.sender][_symbol] >= _amount, "There is not enough Tokens in the balance to create a SELL Order");
        } else {
            require(tokenBalances[msg.sender][DAI] >= _amount.mul(_price), "There is not enough DAI Tokens in the balance to create a BUY Order");
        }

        Order[] storage orders = orderBook[_symbol][_orderType];
        orders.push(Order(nextOrderId,_orderType,msg.sender,_symbol,_amount,0,_price,block.timestamp));
        
        // bubble sort algorithm to sort the new Order properly in the Order[] orders array
            // If it's a BUY order, the highest prices go first
            // If it's a SELL order, the lowest prices go first
        uint i = (orders.length > 0 ? orders.length -1 : 0);
        while(i > 0) {
            if(orders[i].orderType == OrderType.BUY && orders[i-1].price > orders[i].price) {
                break;
            }
            if(orders[i].orderType == OrderType.SELL && orders[i-1].price < orders[i].price) {
                break;
            }
            // If any of the above conditions was met, that means that the order at the left is greater and is required to swap the orders to sort the new order!
            Order memory order = orders[i-1];   // Store in a temporary order the order at the left (i-1)
            orders[i-1] = orders[i];    // Swap the order at the left for the new order (the new order will always be the order at the i index)
            orders[i] = order;  // After the new order has been re-order at the left, now assign the order that was at the left onto the current position

            i = i.sub(1);
        }
        nextOrderId = nextOrderId.add(1);
    }

    function createMarketOrder(bytes32 _symbol, uint _amount, OrderType _orderType) external validAmount(_amount) onlyAllowedTokens(_symbol) tokenIsNotDai(_symbol) {
        if(_orderType == OrderType.SELL) {
            require(_amount <= tokenBalances[msg.sender][_symbol], "There is not enough Tokens in your balance, deposit more");
        }
        
        // Create a pointer to the opposite OrderType of the Market Order
        Order[] storage orders = orderBook[_symbol][(_orderType == OrderType.SELL ? OrderType.BUY : OrderType.SELL)];

        // Algorithm to fill Market Orders
        uint remaining = _amount;
        uint i = 0;
        while(i < orders.length && remaining > 0) {
            uint available = orders[i].amount - orders[i].filled;
            uint matched = (remaining > available ? available : remaining);
            remaining = remaining.sub(matched);
            orders[i].filled = orders[i].filled.add(matched);

            if(_orderType == OrderType.SELL) {
                // For the user that created the Marker Order - userInitiator
                tokenBalances[msg.sender][_symbol] = tokenBalances[msg.sender][_symbol].sub(matched);
                tokenBalances[msg.sender][DAI] = tokenBalances[msg.sender][DAI].add(matched.mul(orders[i].price));
                // For the user that created the Limit Order - userFill
                tokenBalances[orders[i].trader][_symbol] = tokenBalances[orders[i].trader][_symbol].add(matched);
                tokenBalances[orders[i].trader][DAI] = tokenBalances[orders[i].trader][DAI].sub(matched.mul(orders[i].price));
            } else {    // If the Market Order is a BUY Order
                // Validate that the Buyer (the userInitiation - the one who crates the Market Order) has enough DAI to pay for the requested amount of Tokens
                require(tokenBalances[msg.sender][DAI] >= _amount.mul(orders[i].price), "The user does not have enough DAI to buy the requested amount of tokens");
                
                // For the user that created the Marker Order - userInitiator
                tokenBalances[msg.sender][_symbol] = tokenBalances[msg.sender][_symbol].add(matched);
                tokenBalances[msg.sender][DAI] = tokenBalances[msg.sender][DAI].sub(matched.mul(orders[i].price));
                // For the user that created the Limit Order - userFill
                tokenBalances[orders[i].trader][_symbol] = tokenBalances[orders[i].trader][_symbol].sub(matched);
                tokenBalances[orders[i].trader][DAI] = tokenBalances[orders[i].trader][DAI].add(matched.mul(orders[i].price));
            }
            // Trade event should be emitted after the tokenBalances were updated, if an error occurs while updating the balances, the entire transaction must be reverted, and that means that the Trade was actually not executed!
            emit Trade(nextTradeId, orders[i].orderId, orders[i].symbol, orders[i].orderType, msg.sender, orders[i].trader, matched, orders[i].price, (orders[i].price.mul(matched)), block.timestamp);
            
            nextTradeId = nextTradeId.add(1);
            i = i.add(1);
        }

        // Algorithm to clean up orders that have been totally filled from the Order Book
        i = 0;
        while(i < orders.length){
            if(orders[i].amount == orders[i].filled) {
                for(uint j = i; j < orders.length -1; j++) {
                    orders[j] = orders[j + 1];
                }
                orders.pop();
                continue;
            }
            i = i.add(1);
        }
    }

    function getOrders(bytes32 _symbol, OrderType _orderType) external view returns(Order[] memory) {
        return orderBook[_symbol][_orderType];
    }

    function getTokens() external view returns(Token[] memory) {
        Token[] memory _tokens = new Token[](tokenList.length);
        for(uint i = 0; i < tokenList.length; i++) {
            // tokenList[i] gives access to the symbol = a bytes32 variable
            _tokens[i] = Token(
                tokens[tokenList[i]].symbol,
                tokens[tokenList[i]].tokenAddress
                );
        }
        return _tokens;
    }

    function getTotalTokensInDex(bytes32 _symbol) external view returns(uint) {
        return tokenBalances[address(this)][_symbol];
    }
    
}