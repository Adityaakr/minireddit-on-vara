use std::{
    env,
    fs::File,
    io::{BufRead, BufReader},
    path::PathBuf,
};

fn main() {
    sails_rs::build_wasm();

    if env::var("__GEAR_WASM_BUILDER_NO_BUILD").is_ok() {
        return;
    }

    let idl_file_path = "mini_reddit_vara.idl";

    sails_idl_gen::generate_idl_to_file::<mini_reddit_app::MiniRedditProgram>(idl_file_path)
        .unwrap();

    println!("cargo:rerun-if-changed=app/src");
}
