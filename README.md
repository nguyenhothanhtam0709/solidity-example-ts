# Introduction
A simple project to test & deploy solidity using hardhat & typescript.  
See [The New Solidity Dev Stack: Hardhat + Ethers + Waffle + Typescript [Tutorial]](https://rahulsethuram.medium.com/the-new-solidity-dev-stack-buidler-ethers-waffle-typescript-tutorial-f07917de48ae) for more information.

# Project setup
Before setup, using `nvm use` to select correct node version.
```bash
# Select correct node version
nvm use
```
Recommend using yarn over npm.

```bash
# Install dependency
yarn ci

# compile solidity smart contract
yarn compile
```
Creating and *.env* file like *.env.example* file
```bash
RINKEBY_URL=  # rinkeby endpoint
ACCOUNT_PRIVATE_KEY= # private key of account using to deploy
```

# Scripts
## Testing
```bash
# Testing
yarn test

# Coverage
yarn coverage
```

## Deploy
### Deploy to local node
```bash
# Run a local node
yarn node:local

# Deploy to local node
yarn deploy:local
```

### Deploy to a network
```bash
# Deploy to Rinkeby testnet
yarn deploy:rinkeby
```