use crate::error::Error;
use ckb_auth_rs::{
    ckb_auth, generate_sighash_all, AuthAlgorithmIdType, CkbAuthError, CkbAuthType, CkbEntryType, EntryCategoryType,
};
use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, core::ScriptHashType, prelude::*},
    high_level::{load_script, load_witness_args},
};
use core::result::Result;

pub fn main() -> Result<(), Error> {
    let message = generate_sighash_all().map_err(|_| Error::GeneratedMsgError)?;
    let signature = {
        let witness_args = load_witness_args(0, Source::GroupInput).map_err(|_| Error::WitnessError)?;
        let witness = witness_args
            .lock()
            .to_opt()
            .ok_or(CkbAuthError::SignatureMissing)?
            .raw_data();
        witness.to_vec()
    };
    let pubkey_hash = {
        let script = load_script()?;
        let args: Bytes = script.args().unpack();
        let pubkey_hash: [u8; 20] = args.to_vec().try_into().unwrap();
        pubkey_hash
    };

    let id = CkbAuthType {
        algorithm_id: AuthAlgorithmIdType::Bitcoin,
        pubkey_hash: pubkey_hash,
    };
    let code_hash: [u8; 32] = {
        let code_hash = hex::decode("d58efac8d054943e3db319e20ca74c9861c479208969813f3dc7811a776af9f9").unwrap();
        code_hash.try_into().unwrap()
    };
    let entry = CkbEntryType {
        code_hash: code_hash,
        hash_type: ScriptHashType::Data1,
        entry_category: EntryCategoryType::Exec,
    };
    ckb_auth(&entry, &id, &signature, &message)?;

    Ok(())
}
