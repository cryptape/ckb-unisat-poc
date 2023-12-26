import ckb

user = ckb.scw.Scw(1)
hole = ckb.core.Script(
    ckb.config.current.script.secp256k1_blake160.code_hash,
    ckb.config.current.script.secp256k1_blake160.hash_type,
    bytearray([0] * 20)
)

print('auth')
with open('./bin/auth', 'rb') as f:
    data = f.read()
    print(ckb.core.hash(data).hex())
    hash = user.script_deploy(hole, data)
    print(hash)

print('unisat')
with open('./bin/unisat', 'rb') as f:
    data = f.read()
    print(ckb.core.hash(data).hex())
    hash = user.script_deploy(hole, data)
    print(hash)
