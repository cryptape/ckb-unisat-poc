# ckb-unisat-poc
A demo(PoC) to support UniSat wallet on CKB.

# Tested in testnet
```sh
$ cd dapp
$ npm install
# Transfer 100 CKB from ada to bob.
$ npm run cmdWalletUnisat

# Native Segwit
$ npm run cmdWalletUnisat -- --address-type 0 --capacity 100
# Nested Segwit
$ npm run cmdWalletUnisat -- --address-type 1 --capacity 100
# Taproot
$ npm run cmdWalletUnisat -- --address-type 2 --capacity 100
# Legacy
$ npm run cmdWalletUnisat -- --address-type 3 --capacity 100

# Use this demo in web browser
$ npm run ui
```
