use crate::error::Error;
use ckb_auth_rs::{
    ckb_auth, generate_sighash_all, AuthAlgorithmIdType, CkbAuthError, CkbAuthType, CkbEntryType, EntryCategoryType,
};
use ckb_std::{
    ckb_constants::Source,
    ckb_types::{bytes::Bytes, prelude::*},
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
        let pubkey_hash: [u8; 20] = args.try_into().unwrap();
        pubkey_hash
    };

    let id = CkbAuthType {
        algorithm_id: AuthAlgorithmIdType::Bitcoin,
        pubkey_hash: pubkey_hash,
    };
    let code_hash: [u8; 32] = {
        let code_hash = hex::decode("7d6c0a3af5d58c4b59081505446fb3db44bf69af34024c78f40cc4fecec723b7").unwrap();
        code_hash.try_into().unwrap()
    };
    let entry = CkbEntryType {
        code_hash: code_hash,
        hash_type: 2,
        entry_category: EntryCategoryType::Exec,
    };
    ckb_auth(&entry, &id, &signature, &message)?;

    Ok(())
}
