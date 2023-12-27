import { walletSecp256k1, walletSecp256k1Transfer } from './walletSecp256k1'
import { BI } from '@ckb-lumos/lumos';

async function main() {
    const ada = walletSecp256k1('0x0000000000000000000000000000000000000000000000000000000000000001')
    const bob = walletSecp256k1('0x0000000000000000000000000000000000000000000000000000000000000002')
    const ret = await walletSecp256k1Transfer(ada, bob.script, BI.from(100).mul(100000000))
    console.log(ret)
}

main()
