import { bytes } from '@ckb-lumos/codec';
import { BI, Hash, helpers } from '@ckb-lumos/lumos';
import { bech32 } from 'bech32';
import * as bitcoinjs from "bitcoinjs-lib";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { conf, walletOkx, walletOkxCapacity, walletOkxTransfer } from "./walletOkx";

export function asyncSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const app = document.getElementById("root");
ReactDOM.render(<App />, app);

export function App() {
  const [varAdaAddrBTC, setAdaAddrBTC] = useState("");
  const [varAdaAddrType, setAdaAddrType] = useState("?");
  const [varAdaCapacity, setAdaCapacity] = useState("0");
  const [varAdaInfo, setAdaInfo] = useState("");

  const [varBobAddrBTC, setBobAddrBTC] = useState("");
  const [varBobAddrType, setBobAddrType] = useState("?");
  const [varBobCapacity, setBobCapacity] = useState("0");
  const [varBobInfo, setBobInfo] = useState("");

  const [varCapacity, setCapacity] = useState("100");

  const [varHash, setHash] = useState("")

  useEffect(() => {
    const update = async () => {
      const ada = walletOkx(varAdaAddrBTC);
      if (varAdaAddrBTC.startsWith('bc1q')) {
        setAdaAddrType('Native Segwit (P2WPKH)')
      }
      if (varAdaAddrBTC.startsWith('3')) {
        setAdaAddrType('Nested Segwit (P2SH-P2WPKH)')
      }
      if (varAdaAddrBTC.startsWith('1')) {
        setAdaAddrType('Legacy (P2PKH)')
      }
      setAdaCapacity((await walletOkxCapacity(ada)).div(100000000).toString())
      setAdaInfo(JSON.stringify(ada, null, 4));
    };
    if (varAdaAddrBTC) {
      update()
    }
  }, [varAdaAddrBTC]);

  useEffect(() => {
    const update = async () => {
      const bob = walletOkx(varBobAddrBTC);
      if (varBobAddrBTC.startsWith('bc1q')) {
        setBobAddrType('Native Segwit (P2WPKH)')
      }
      if (varBobAddrBTC.startsWith('3')) {
        setBobAddrType('Nested Segwit (P2SH-P2WPKH)')
      }
      if (varBobAddrBTC.startsWith('1')) {
        setBobAddrType('Legacy (P2PKH)')
      }
      setBobCapacity((await walletOkxCapacity(bob)).div(100000000).toString())
      setBobInfo(JSON.stringify(bob, null, 4));
    };
    if (varBobAddrBTC) {
      update()
    }
  }, [varBobAddrBTC]);

  useEffect(() => {
    const f = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      const user = await window.okxwallet.bitcoin.connect();
      const addr = user.address
      if (addr.startsWith('bc1p')) {
        // Taproot
        let pubkeyString = user.compressedPublicKey
        let pubkeyBuffer = bytes.bytify('0x' + pubkeyString)
        let pubkeyHash = bitcoinjs.crypto.hash160(pubkeyBuffer);
        let pubkeyWord = bech32.toWords(pubkeyHash)
        pubkeyWord.unshift(0)
        setAdaAddrBTC(bech32.encode('bc', pubkeyWord))
      } else {
        setAdaAddrBTC(addr)
      }
      setBobAddrBTC('bc1qlqve6tdx30j7xsmuappwc5pfh7nml3anxugjke')
    };
    f()
  }, []);

  async function handleTransfer(adaAddrBTC, bobAddrBTC, capacity) {
    let ada = walletOkx(adaAddrBTC)
    ada.sign = async (hash: Hash): Promise<Hash> => {
      const signBase64 = await window.okxwallet.bitcoin.signMessage(hash.slice(2), {
        from: (await window.okxwallet.bitcoin.connect()).address
      })
      let sign = Buffer.from(signBase64, 'base64')
      if (ada.addr.btc.startsWith('bc1q')) {
        sign[0] = 39 + (sign[0] - 27) % 4
      }
      if (ada.addr.btc.startsWith('3')) {
        sign[0] = 35 + (sign[0] - 27) % 4
      }
      if (ada.addr.btc.startsWith('1')) {
        sign[0] = 31 + (sign[0] - 27) % 4
      }
      return bytes.hexify(sign)
    }
    const bob = walletOkx(bobAddrBTC)
    const ret = await walletOkxTransfer(ada, bob.script, BI.from(capacity).mul(100000000))
    setHash(ret)
  }


  return (
    <div>
      <p>From addr: {varAdaAddrBTC}</p>
      <p>From addr type: {varAdaAddrType}</p>
      <p>From capacity: {varAdaCapacity}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{varAdaInfo}</p>

      <label htmlFor="bob-addr-btc">To addr: </label>
      <input id="bob-addr-btc" value={varBobAddrBTC} type="text" onChange={(e) => setBobAddrBTC(e.target.value)} />
      <p>To addr type: {varBobAddrType}</p>
      <p>To capacity: {varBobCapacity}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{varBobInfo}</p>

      <label htmlFor="capacity">Capacity</label>
      <input id="capacity" value={varCapacity} type="text" onChange={(e) => setCapacity(e.target.value)} />
      <br />

      <button onClick={() => handleTransfer(varAdaAddrBTC, varBobAddrBTC, varCapacity)}>Transfer</button>

      <p>https://pudge.explorer.nervos.org/transaction/{varHash}</p>
    </div>
  );
}
