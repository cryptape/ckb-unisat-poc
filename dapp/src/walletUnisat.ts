import { blockchain } from '@ckb-lumos/base';
import { bytes } from '@ckb-lumos/codec';
import { BI, DepType, Hash, HashType, RPC, Script, Transaction, config, helpers, utils } from '@ckb-lumos/lumos';
import { bech32 } from 'bech32';

const conf = {
    lumos: config.predefined.AGGRON4,
    url: 'https://testnet.ckb.dev',
    unisat: {
        codeHash: '0x7d6c0a3af5d58c4b59081505446fb3db44bf69af34024c78f40cc4fecec723b7',
        hashType: 'data1' as HashType,
        cellCep: {
            outPoint: {
                txHash: '0xd03ff5967b7136e2415303cc0733ced5ced4fe84ea97b50b64ae32c9f64538ec',
                index: '0x0',
            },
            depType: 'code' as DepType,
        }
    }
}

interface WalletUnisat {
    script: Script,
    addr: string,
    sign(hash: Hash): Promise<Hash>,
}

function walletUnisat(addr: string): WalletUnisat {
    const script: Script = {
        codeHash: conf.unisat.codeHash,
        hashType: conf.unisat.hashType,
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
            console.log(`> F12 console: await unisat.signMessage('${hash.slice(2)}')`)
            console.log(`< Base64 sign:`)
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
    tx.cellDeps.push(conf.unisat.cellCep)
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
    console.log(ret)
}

main()