# ckb-unisat-poc
A demo(PoC) to support UniSat wallet on CKB.

## Project Description

* dapp

The demo web UI. By this, we can transfer assets on CKB testnet with UniSat Wallet.

* unisat

The CKB on-chain script. It is already deployed on testnet.

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
# Use this demo in web browser
$ npm run ui
```

## P2TR Address Issue
We examined the `signMessage` API and discovered its lack of support for schnorr
signatures. As its document describes, only "ecdsa"(secp256k1) is supported.
Upon transitioning to the Taproot (P2TR) address type, we obtained the public
key for Ada:

```javascript
> await unisat.getPubkey();
028d7b778457ebbd11da8a7dddcb21c481d9223303835174b6ab81fd7f6d33553a
```

Notably, this key is 33 bytes, whereas schnorr signatures typically consist of
32 bytes. Subsequently, we generated a signature using `signMessage`:

```javascript
> await unisat.signMessage("0000000000000000000000000000000000000000000000000000000000000000");
'HPziNYdgXBQdozgHM10skbeJPu2WGyaW1P1H6i4XOok4AjDKjjqJf/b+qkvz6OuMIgre+O2g0ZX4KEDBbGXrcc4='
```

Upon decoding, the signature revealed a length of 65 bytes:

```plaintext
1cfce23587605c141da33807335d2c91b7893eed961b2696d4fd47ea2e173a89380230ca8e3a897ff6feaa4bf3e8eb8c220adef8eda0d195f82840c16c65eb71ce
```

This surpasses the expected 64 bytes for a schnorr signature, leading us to
suspect the utilization of the secp256k1 algorithm. Filling the public key and
signature information in Native Segwit (P2WPKH) resulted in successful
validation.

The drawback of current solution is that, as a receiver with P2TR address, users
can't give the displaying address on UniSat wallet to senders. Instead, a new
generated native segwit address is used via following pseudo code:
```js
let pubkey = unisat.getPublicKey();
let pubkey_hash = RIPEMD160(SHA256(pubkey));
let address = bech32_encode(pubkey_hash);
```
