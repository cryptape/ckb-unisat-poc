import { blockchain } from '@ckb-lumos/base';
import { bytes } from '@ckb-lumos/codec';
import { BI, DepType, Hash, HashType, RPC, Script, Transaction, config, helpers, utils } from '@ckb-lumos/lumos';
import { bech32 } from 'bech32';
import * as bs58 from 'bs58';
import { program } from 'commander';

const conf = {
    lumos: config.predefined.AGGRON4,
    url: 'https://testnet.ckb.dev',
    script: {
        auth: {
            codeHash: '0xd58efac8d054943e3db319e20ca74c9861c479208969813f3dc7811a776af9f9',
            hashType: 'data1' as HashType,
            cellCep: {
                outPoint: {
                    txHash: '0xd4f72f0504373ff8effadf44f92c46a0062774fb585ebcacc24eb47b98e2d66a',
                    index: '0x0',
                },
                depType: 'code' as DepType,
            }
        },
        unisat: {
            codeHash: '0x0a19d5886a6f2c1fe8c03c4c796db07bba7233e825a4d28e7e2d9e4d4e2b5414',
            hashType: 'data1' as HashType,
            cellCep: {
                outPoint: {
                    txHash: '0x138fcdbdef2d065577e2bec73d1d6589c66a45412ab4ebcb4ea4db1fe3fcd71a',
                    index: '0x0',
                },
                depType: 'code' as DepType,
            }
        }
    },
}

interface WalletUnisat {
    script: Script,
    addr: {
        ckb: string,
        btc: string,
    },
    sign(hash: Hash): Promise<Hash>,
}

function walletUnisat(addr: string): WalletUnisat {
    let args = '0x'
    if (addr.startsWith('bc1q')) {
        // NativeSegwit
        args = bytes.hexify(bech32.fromWords(bech32.decode(addr).words.slice(1)))
    }
    if (addr.startsWith('3')) {
        // NestedSegwit
        args = bytes.hexify(bs58.decode(addr).slice(1, 21))
    }
    if (addr.startsWith('bc1p')) {
        // Taproot
        throw 'unreachable'
    }
    if (addr.startsWith('1')) {
        // Legacy
        args = bytes.hexify(bs58.decode(addr).slice(1, 21))
    }
    const script: Script = {
        codeHash: conf.script.unisat.codeHash,
        hashType: conf.script.unisat.hashType,
        args: args,
    }
    return {
        script: script,
        addr: {
            ckb: helpers.encodeToAddress(script, {
                config: conf.lumos,
            }),
            btc: addr,
        },
        sign: async (hash: Hash): Promise<Hash> => {
            async function readline(): Promise<string> {
                return new Promise((resolve, _) => {
                    process.stdin.resume();
                    process.stdin.on('data', function (data) {
                        process.stdin.pause();
                        resolve(data.toString());
                    })
                })
            }
            console.log(`run code in browser console: await unisat.signMessage('${hash.slice(2)}')`)
            console.log('copy signature from console:')
            let signBase64 = await readline()
            let sign = Buffer.from(signBase64, 'base64')
            if (addr.startsWith('bc1q')) {
                sign[0] = 39 + (sign[0] - 27) % 4
            }
            if (addr.startsWith('3')) {
                sign[0] = 35 + (sign[0] - 27) % 4
            }
            if (addr.startsWith('bc1p')) {
                throw 'unreachable'
            }
            if (addr.startsWith('1')) {
                sign[0] = 31 + (sign[0] - 27) % 4
            }
            return bytes.hexify(sign)
        },
    }
}

async function walletUnisatCapacity(sender: WalletUnisat): Promise<BI> {
    const r = await new RPC(conf.url).getCellsCapacity({
        script: sender.script,
        scriptType: 'lock',
        filter: {
            scriptLenRange: ['0x0', '0x1']
        }
    })
    return BI.from(r.capacity)
}

async function walletUnisatTransfer(
    sender: WalletUnisat,
    script: Script,
    capacity: BI,
) {
    let senderCapacity = BI.from(0)
    let acceptCapacity = capacity
    let acceptScript = script
    let changeCapacity = BI.from(0)
    let changeScript = sender.script
    let tx: Transaction = { version: '0x0', cellDeps: [], headerDeps: [], inputs: [], outputs: [], outputsData: [], witnesses: [] }
    tx.cellDeps.push({
        outPoint: { txHash: conf.lumos.SCRIPTS.SECP256K1_BLAKE160.TX_HASH, index: conf.lumos.SCRIPTS.SECP256K1_BLAKE160.INDEX },
        depType: conf.lumos.SCRIPTS.SECP256K1_BLAKE160.DEP_TYPE,
    })
    tx.cellDeps.push(conf.script.auth.cellCep)
    tx.cellDeps.push(conf.script.unisat.cellCep)
    tx.outputs.push({ capacity: acceptCapacity.toHexString(), lock: acceptScript, type: undefined })
    tx.outputs.push({ capacity: changeCapacity.toHexString(), lock: changeScript, type: undefined })
    tx.outputsData.push('0x')
    tx.outputsData.push('0x')
    tx.witnesses.push(bytes.hexify(blockchain.WitnessArgs.pack({ lock: new Uint8Array(65), inputType: undefined, outputType: undefined })))
    const senderCellResult = await new RPC(conf.url).getCells({
        script: sender.script,
        scriptType: 'lock',
        filter: {
            scriptLenRange: ['0x0', '0x1']
        }
    }, 'asc', '0x100', undefined)
    const senderCell = senderCellResult['objects']
    for (const cell of senderCell) {
        const cellOutPoint = cell.outPoint
        const cellCapacity = BI.from(cell.output.capacity)
        const cellInput = { since: '0x0', previousOutput: cellOutPoint }
        senderCapacity = senderCapacity.add(cellCapacity)
        tx.inputs.push(cellInput)
        changeCapacity = senderCapacity.sub(acceptCapacity).sub(blockchain.Transaction.pack(tx).length + 4)
        if (changeCapacity.gte(BI.from(61).mul(100000000))) {
            break
        }
    }
    if (changeCapacity.lt(BI.from(61).mul(100000000))) {
        throw 'unreachable'
    }
    tx.outputs[1].capacity = changeCapacity.toHexString()
    let hasher = new utils.CKBHasher()
    hasher.update(bytes.bytify(utils.ckbHash(blockchain.RawTransaction.pack(tx))))
    for (let e of tx.witnesses) {
        let witness = bytes.bytify(e)
        let sizebuf = new Uint8Array(8)
        sizebuf[0] = Math.floor(witness.length % 256)
        sizebuf[1] = Math.floor(witness.length / 256)
        hasher.update(sizebuf)
        hasher.update(witness)
    }
    let txHash = hasher.digestHex()
    let txSign = await sender.sign(txHash)
    tx.witnesses[0] = bytes.hexify(blockchain.WitnessArgs.pack({ lock: txSign, inputType: undefined, outputType: undefined }))
    return await new RPC(conf.url).sendTransaction(tx, 'passthrough')
}


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

    const ada = walletUnisat(adaAddrBTC)
    console.log(`ada capacity: ${(await walletUnisatCapacity(ada)).div(100000000).toString()}`)
    console.log(`ada addr.btc: ${ada.addr.btc}`)
    console.log(`ada addr.ckb: ${ada.addr.ckb}`)

    const bob = walletUnisat(bobAddrBTC)
    console.log(`bob capacity: ${(await walletUnisatCapacity(bob)).div(100000000).toString()}`)
    console.log(`bob addr.btc: ${bob.addr.btc}`)
    console.log(`bob addr.ckb: ${bob.addr.ckb}`)

    const ret = await walletUnisatTransfer(ada, bob.script, BI.from(options.capacity).mul(100000000))
    console.log(`open: https://pudge.explorer.nervos.org/transaction/${ret}`)
}

main()
