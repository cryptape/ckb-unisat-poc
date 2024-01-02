import { BI } from '@ckb-lumos/lumos';
import { walletOkx, walletOkxCapacity, walletOkxTransfer } from "./walletOkx";

async function main() {
    let adaAddrBTC = 'bc1qngwkvfhwnp79dzfkdw8ylfaptcv9gzvk8ggvd4'
    let bobAddrBTC = '1ECwWZfa2LCSCciaKFAsaXLaF7UpqSqW7H'

    const ada = walletOkx(adaAddrBTC)
    console.log(`ada capacity: ${(await walletOkxCapacity(ada)).div(100000000).toString()}`)
    console.log(`ada addr.btc: ${ada.addr.btc}`)
    console.log(`ada addr.ckb: ${ada.addr.ckb}`)

    const bob = walletOkx(bobAddrBTC)
    console.log(`bob capacity: ${(await walletOkxCapacity(bob)).div(100000000).toString()}`)
    console.log(`bob addr.btc: ${bob.addr.btc}`)
    console.log(`bob addr.ckb: ${bob.addr.ckb}`)

    const ret = await walletOkxTransfer(ada, bob.script, BI.from(100).mul(100000000))
    console.log(`open: https://pudge.explorer.nervos.org/transaction/${ret}`)
}

main()
