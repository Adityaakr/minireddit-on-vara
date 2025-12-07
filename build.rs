use std::env;

fn main() {
    sails_rs::build_wasm();

    if env::var("__GEAR_WASM_BUILDER_NO_BUILD").is_ok() {
        return;
    }

    let idl_file_path = "lumio-social.idl";

    sails_idl_gen::generate_idl_to_file::<lumio_social_app::LumioSocialProgram>(idl_file_path)
        .unwrap();

    println!("cargo:rerun-if-changed=app/src");
}
