# ckb-unisat-poc
A demo(PoC) to support UniSat wallet on CKB.


## Setup
First, please install [UniSat Wallet](https://hk.unisat.io/download).

To avoid setup accounts and balances from scratch on CBK testnet, we have
exported 2 accounts from UniSat Wallet: Ada and Bob. We have hard coded these 2
accounts in demo.

* In the top right corner of the UniSat Wallet interface, click on HD Wallet #n.
* Click the + in the top right corner.
* Select "Restore from mnemonics."
* Choose "UniSat Wallet."
* Choose 12 words and fill mnemonic phrase: cousin minimum crazy knock electric curve inflict acid neck gift castle slush
* Choose "Native Segwit (P2WPKH)" can be modified later.
* Verify that the wallet address is: bc1qngwkvfhwnp79dzfkdw8ylfaptcv9gzvk8ggvd4.

Name this wallet as Ada. Applying some steps as above for Bob:

Mnemonic phrase: soup butter loud convince rabbit horn salute clump still amount immune sustain
Address: bc1qlqve6tdx30j7xsmuappwc5pfh7nml3anxugjke

WARN: Don't send any money to these 2 accounts on UniSat Wallet! Everyone can spend them.

## Tested in testnet
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
