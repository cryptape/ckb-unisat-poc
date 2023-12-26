import { blockchain } from '@ckb-lumos/base';
import { bytes } from '@ckb-lumos/codec';
import { BI, DepType, Hash, HashType, RPC, Script, Transaction, config, helpers, utils } from '@ckb-lumos/lumos';
import { bech32 } from 'bech32';

const conf = {
    lumos: config.predefined.AGGRON4,
    url: 'https://testnet.ckb.dev',
    script: {
        auth: {
            codeHash: '0x7d4ebf8efd045af51a89b77c9c012716d51ffc22c0b2e0caeb8acc1273f167c9',
            hashType: 'data1' as HashType,
            cellCep: {
                outPoint: {
                    txHash: '0x481f5fd44c0ec36717e00f823a22b7318bc18d05cf56c932766437549e179347',
                    index: '0x0',
                },
                depType: 'code' as DepType,
            }
        },
        unisat: {
            codeHash: '0xbfb39a6580a22dee007b6d1de689a966ac5c966cdd094fb928dddfe8499e9ef4',
            hashType: 'data1' as HashType,
            cellCep: {
                outPoint: {
                    txHash: '0xa889a4aae0f02c2e00e52e71a7fec87c7c795e8e48e8e6238e860f7f57ed246d',
                    index: '0x0',
                },
                depType: 'code' as DepType,
            }
        }
    },
}

interface WalletUnisat {
    script: Script,
    addr: string,
    sign(hash: Hash): Promise<Hash>,
}

function walletUnisat(addr: string): WalletUnisat {
    const script: Script = {
        codeHash: conf.script.unisat.codeHash,
        hashType: conf.script.unisat.hashType,
        args: bytes.hexify(bech32.fromWords(bech32.decode(addr).words.slice(1))),
    }
    return {
        script: script,
        addr: helpers.encodeToAddress(script, {
            config: conf.lumos,
        }),
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
            sign[0] = 35 + (sign[0] - 27) % 4
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
    console.assert(changeCapacity.gte(BI.from(61).mul(100000000)))
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
    const ada = walletUnisat('bc1qngwkvfhwnp79dzfkdw8ylfaptcv9gzvk8ggvd4')
    console.log(`ada|bc1qngwkvfhwnp79dzfkdw8ylfaptcv9gzvk8ggvd4 capacity: ${(await walletUnisatCapacity(ada)).div(100000000).toString()}`)
    const bob = walletUnisat('bc1qlqve6tdx30j7xsmuappwc5pfh7nml3anxugjke')
    console.log(`bob|bc1qlqve6tdx30j7xsmuappwc5pfh7nml3anxugjke capacity: ${(await walletUnisatCapacity(bob)).div(100000000).toString()}`)
    const ret = await walletUnisatTransfer(ada, bob.script, BI.from(100).mul(100000000))
    console.log(`open: https://pudge.explorer.nervos.org/transaction/${ret}`)
}

main()
