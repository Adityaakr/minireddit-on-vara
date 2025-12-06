use std::env;

fn main() {
    sails_rs::build_wasm();

    if env::var("__GEAR_WASM_BUILDER_NO_BUILD").is_ok() {
        return;
    }

    let idl_file_path = "vibepost.idl";

    sails_idl_gen::generate_idl_to_file::<vibepost_app::VibePostProgram>(idl_file_path)
        .unwrap();

    println!("cargo:rerun-if-changed=app/src");
}
