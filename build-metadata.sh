#!/bin/bash
set -e

echo "📝 Generating metadata IDL file..."

# Create a temporary Rust file to generate metadata
cat > /tmp/gen_metadata.rs << 'EOF'
use mini_reddit_io::ProgramMetadata;

fn main() {
    let metadata = gmeta::metagen::generate_metadata::<ProgramMetadata>();
    println!("{}", metadata);
}
EOF

# Build and run to generate IDL
cd io
cargo run --example generate_idl 2>/dev/null || {
    echo "Creating metadata generator..."
    mkdir -p examples
    cat > examples/generate_idl.rs << 'EOF'
use mini_reddit_io::ProgramMetadata;

fn main() {
    println!("{}", gmeta::metagen::generate_metadata::<ProgramMetadata>());
}
EOF
    cargo run --example generate_idl > ../mini_reddit.idl
}

cd ..
echo "✅ Metadata IDL generated: mini_reddit.idl"
