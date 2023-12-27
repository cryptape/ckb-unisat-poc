import { bytes } from '@ckb-lumos/codec';
import { BI, Hash } from '@ckb-lumos/lumos';
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { walletUnisat, walletUnisatCapacity, walletUnisatTransfer } from "./walletUnisat";

export function asyncSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const app = document.getElementById("root");
ReactDOM.render(<App />, app);

export function App() {
  const [varAdaAddrBTC, setAdaAddrBTC] = useState("");
  const [varAdaCapacity, setAdaCapacity] = useState("0");
  const [varAdaInfo, setAdaInfo] = useState("");

  const [varBobAddrBTC, setBobAddrBTC] = useState("");
  const [varBobCapacity, setBobCapacity] = useState("0");
  const [varBobInfo, setBobInfo] = useState("");

  const [varCapacity, setCapacity] = useState("100");

  const [varHash, setHash] = useState("")

  useEffect(() => {
    const update = async () => {
      const ada = walletUnisat(varAdaAddrBTC);
      setAdaCapacity((await walletUnisatCapacity(ada)).div(100000000).toString())
      setAdaInfo(JSON.stringify(ada, null, 4));
    };
    if (varAdaAddrBTC) {
      update()
    }
  }, [varAdaAddrBTC]);

  useEffect(() => {
    const update = async () => {
      const bob = walletUnisat(varBobAddrBTC);
      setBobCapacity((await walletUnisatCapacity(bob)).div(100000000).toString())
      setBobInfo(JSON.stringify(bob, null, 4));
    };
    if (varBobAddrBTC) {
      update()
    }
  }, [varBobAddrBTC]);

  useEffect(() => {
    const f = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await window.unisat.initialize();
      const addr = await window.unisat.requestAccounts();
      setAdaAddrBTC(addr[0])
      setBobAddrBTC('bc1qlqve6tdx30j7xsmuappwc5pfh7nml3anxugjke')
    };
    f()
  }, []);

  async function handleTransfer(adaAddrBTC, bobAddrBTC, capacity) {
    let ada = walletUnisat(adaAddrBTC)
    ada.sign = async (hash: Hash): Promise<Hash> => {
      const signBase64 = await window.unisat.signMessage(hash.slice(2))
      let sign = Buffer.from(signBase64, 'base64')
      if (ada.addr.btc.startsWith('bc1q')) {
        sign[0] = 39 + (sign[0] - 27) % 4
      }
      if (ada.addr.btc.startsWith('3')) {
        sign[0] = 35 + (sign[0] - 27) % 4
      }
      if (ada.addr.btc.startsWith('bc1p')) {
        throw 'unreachable'
      }
      if (ada.addr.btc.startsWith('1')) {
        sign[0] = 31 + (sign[0] - 27) % 4
      }
      return bytes.hexify(sign)
    }
    const bob = walletUnisat(bobAddrBTC)
    const ret = await walletUnisatTransfer(ada, bob.script, BI.from(capacity).mul(100000000))
    setHash(ret)
  }


  return (
    <div>
      <label htmlFor="ada-addr-btc">Ada addr: </label>&nbsp;
      <input id="ada-addr-btc" value={varAdaAddrBTC} type="text" onChange={(e) => setAdaAddrBTC(e.target.value)} />
      <p>Ada capacity: {varAdaCapacity}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{varAdaInfo}</p>

      <label htmlFor="bob-addr-btc">Bob addr: </label>&nbsp;
      <input id="bob-addr-btc" value={varBobAddrBTC} type="text" onChange={(e) => setBobAddrBTC(e.target.value)} />
      <p>Bob capacity: {varBobCapacity}</p>
      <p style={{ whiteSpace: 'pre-wrap' }}>{varBobInfo}</p>

      <label htmlFor="capacity">Capacity</label>&nbsp;
      <input id="capacity" value={varCapacity} type="text" onChange={(e) => setCapacity(e.target.value)} />
      <br />

      <button onClick={() => handleTransfer(varAdaAddrBTC, varBobAddrBTC, varCapacity)}>Transfer</button>

      <p>https://pudge.explorer.nervos.org/transaction/{varHash}</p>
    </div>
  );
}
