import ckb  # Install ckb: pip install git+https://github.com/mohanson/pyckb.git`
import sys

user = ckb.scw.Scw(1)
hole = ckb.core.Script(
    ckb.config.current.script.secp256k1_blake160.code_hash,
    ckb.config.current.script.secp256k1_blake160.hash_type,
    bytearray([0] * 20)
)

if sys.argv[1] == 'auth':
    with open('./bin/auth', 'rb') as f:
        data = f.read()
        print('0x' + ckb.core.hash(data).hex())
        hash = user.script_deploy(hole, data)
        print('0x' + hash.hex())

if sys.argv[1] == 'unisat':
    with open('./unisat/build/release/unisat', 'rb') as f:
        data = f.read()
        print('0x' + ckb.core.hash(data).hex())
        hash = user.script_deploy(hole, data)
        print('0x' + hash.hex())
