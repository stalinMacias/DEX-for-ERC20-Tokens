# DEX-for-ERC20-Tokens
Fully DEX (Descentralized Exchange) to trade various ERC-20 Tokens
## Deescription
- This DEX is capable to trade ERC20 tokens that are in the whitelist of allowed tokens
- The admin of the DEX is able to add ERC20 tokens to the allowed list of tokens to be traded
- The traders can create Limit Orders and set a an specific price to trade their Tokens
- - Limit Orders are added to the Order Book. 
- - Orders in the Order Book will be waiting for Market Orders to be filled
- The traders can create Market Orders, such orders will be executed right ahead and will pay the maximum price for the orders in the Order Book
- There is an algorithm to sort the Limit Orders once they are added to the Order Book
- - When a limit order is selling tokens, the least expensive will be filled first
- - When a limit order is buying tokens, the order that pays the most will be the first one to be filled
- Once an Order from the Order Book has been totally filled will be removed from the Order Book
