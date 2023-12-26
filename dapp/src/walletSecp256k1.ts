import { blockchain } from '@ckb-lumos/base';
import { bytes } from '@ckb-lumos/codec';
import { BI, Hash, HexString, RPC, Script, Transaction, config, hd, helpers, utils } from '@ckb-lumos/lumos';

const conf = {
    lumos: config.predefined.AGGRON4,
    url: 'https://testnet.ckb.dev',
}

interface WalletSecp256k1 {
    prikey: HexString,
    pubkey: HexString,
    script: Script,
    addr: string,
    sign(hash: Hash): Hash,
}

function walletSecp256k1(privateKey: HexString): WalletSecp256k1 {
    const script: Script = {
        codeHash: conf.lumos.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
        hashType: conf.lumos.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE,
        args: hd.key.privateKeyToBlake160(privateKey),
    };
    return {
        prikey: privateKey,
        pubkey: hd.key.privateToPublic(privateKey),
        script: script,
        addr: helpers.encodeToAddress(script, {
            config: conf.lumos,
        }),
        sign: (hash: Hash): Hash => {
            return hd.key.signRecoverable(hash, privateKey);
        },
    }
}

async function walletSecp256k1Transfer(
    sender: WalletSecp256k1,
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
    let txSign = sender.sign(txHash)
    tx.witnesses[0] = bytes.hexify(blockchain.WitnessArgs.pack({ lock: txSign, inputType: undefined, outputType: undefined }))
    return await new RPC(conf.url).sendTransaction(tx, 'passthrough')
}


async function main() {
    const ada = walletSecp256k1('0x0000000000000000000000000000000000000000000000000000000000000001')
    const bob = walletSecp256k1('0x0000000000000000000000000000000000000000000000000000000000000002')
    const ret = await walletSecp256k1Transfer(ada, bob.script, BI.from(100).mul(100000000))
    console.log(ret)
}

main()
