use gmeta::Metadata;
use mini_reddit_io::ProgramMetadata;

fn main() {
    // Generate metadata in JSON format
    let metadata = gmeta::metadata_json::<ProgramMetadata>();
    println!("{}", metadata);
}
