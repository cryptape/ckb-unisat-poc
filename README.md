# CKB UNISAT POC

A demo(PoC) to support common browser BTC wallets on CKB. Through this project, you can use BTC addresses and BTC wallets to receive and send CKB. Currently supported wallets:

- [Unisat](https://unisat.io/)
- [OKX](https://www.okx.com/en/web3)

## Project Description

* `./dapp`. The demo web UI. By this, we can transfer assets on CKB testnet with browser wallets.
* `./lock`. The CKB on-chain script. It is already deployed on testnet.

## Run With Unisat

0. Install [UniSat Wallet](https://hk.unisat.io/download).
0. Restore two accounts from mnemonic phrase. These two accounts have CKB available for testing.
    1. `cousin minimum crazy knock electric curve inflict acid neck gift castle slush`.
    2. `soup butter loud convince rabbit horn salute clump still amount immune sustain`.
0. Select the address format. It can be `Native Segwit`, `Nested Segwit`, `Legacy` or `Taproot`.
0. Run web ui by `cd dapp && npm install && npm run uiWalletUnisat`.

> Note that Taproot addresses are not fully supported at the moment. When you select a Taproot address, you will find that the address displayed on the web page is different from the address in your wallet. This is normal. You can still spend CKB from the Taproot address. However, if you want to transfer CKB to your Taproot address, then the To addr should be filled in with the new address shown on the web page, not the Taproot address shown by the wallet.

## Run With OKX

0. Install [OKX Wallet](https://www.okx.com/en/web3).
0. Restore two accounts from mnemonic phrase. These two accounts have CKB available for testing.
    1. `cousin minimum crazy knock electric curve inflict acid neck gift castle slush`.
    2. `soup butter loud convince rabbit horn salute clump still amount immune sustain`.
0. Select the address format. It can be `Native Segwit`, `Nested Segwit`, `Legacy` or `Taproot`.
0. Run web ui by `cd dapp && npm install && npm run uiWalletOkx`.

> Note that Taproot addresses are not fully supported at the moment. When you select a Taproot address, you will find that the address displayed on the web page is different from the address in your wallet. This is normal. You can still spend CKB from the Taproot address. However, if you want to transfer CKB to your Taproot address, then the To addr should be filled in with the new address shown on the web page, not the Taproot address shown by the wallet.

## P2TR(Taproot) Address Issue Explanation

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
