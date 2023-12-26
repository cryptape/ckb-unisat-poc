# ckb-unisat-poc
A demo(PoC) to support UniSat wallet on CKB.

# Tested in testnet
```sh
$ cd dapp
$ npm install
$ npm run walletUnisat

# Native Segwit
$ npm run walletUnisat -- --address-type 0 --capacity 100
# Nested Segwit
$ npm run walletUnisat -- --address-type 1 --capacity 100
# Taproot
$ npm run walletUnisat -- --address-type 2 --capacity 100
# Legacy
$ npm run walletUnisat -- --address-type 3 --capacity 100
```
