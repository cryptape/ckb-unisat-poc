import { BI } from '@ckb-lumos/lumos';
import { program } from 'commander';
import { walletOkx, walletOkxCapacity, walletOkxTransfer } from "./walletOkx";

async function main() {
    program
        .option('--address-type <type>', '[p2wpkh, p2sh, p2tr, p2pkh]', 'p2wpkh')
        .option('--capacity <capacity>', 'CKB', '100')
    program.parse(process.argv);
    const options = program.opts();

    let adaAddrBTC = ''
    let bobAddrBTC = ''
    if (options.addressType == 'p2wpkh') {
        adaAddrBTC = 'bc1qngwkvfhwnp79dzfkdw8ylfaptcv9gzvk8ggvd4'
        bobAddrBTC = 'bc1qlqve6tdx30j7xsmuappwc5pfh7nml3anxugjke'
    }
    if (options.addressType == 'p2sh') {
        adaAddrBTC = '38yEUVrMwadmde5oLn9MHvjMvZKsdfYYvE'
        bobAddrBTC = '3Fq9p6D8xptidAhSrgWJscdfCDbkS1CyJ8'
    }
    if (options.addressType == 'p2tr') {
        adaAddrBTC = 'bc1qf5mc6jm6g75p5xxg4cg4ljp39jhn3acxau82w3'
        bobAddrBTC = 'bc1qq3k4d8ejp6rnh7jshsude0kkrdutu27ad43m8r'
    }
    if (options.addressType == 'p2pkh') {
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
