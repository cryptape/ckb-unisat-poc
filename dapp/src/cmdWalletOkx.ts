import { BI } from '@ckb-lumos/lumos';
import { program } from 'commander';
import { walletOkx, walletOkxCapacity, walletOkxTransfer } from "./walletOkx";

async function main() {
    program
        .option('--address-type <type>', '[0, 1, 2, 3]', '0')
        .option('--capacity <capacity>', 'CKB', '100')
    program.parse(process.argv);
    const options = program.opts();

    let adaAddrBTC = ''
    let bobAddrBTC = ''
    if (options.addressType == '0') {
        adaAddrBTC = 'bc1qngwkvfhwnp79dzfkdw8ylfaptcv9gzvk8ggvd4'
        bobAddrBTC = 'bc1qlqve6tdx30j7xsmuappwc5pfh7nml3anxugjke'
    }
    if (options.addressType == '1') {
        adaAddrBTC = '38yEUVrMwadmde5oLn9MHvjMvZKsdfYYvE'
        bobAddrBTC = '3Fq9p6D8xptidAhSrgWJscdfCDbkS1CyJ8'
    }
    if (options.addressType == '2') {
        adaAddrBTC = 'bc1ptty9z984zhagw5c6qegfykjp8lvakwqwr39p3fs3fnzdmd7pmnpq55zgny'
        bobAddrBTC = 'bc1p76fa25lp3latfssexyhl604kv6f3cz9h4rrsmk92wfr7j7zk572sdfsn07'
    }
    if (options.addressType == '3') {
        adaAddrBTC = '1DZrVYP7wmygHtKgbybD39MVkGSwZ581fq'
        bobAddrBTC = '1ECwWZfa2LCSCciaKFAsaXLaF7UpqSqW7H'
    }

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
