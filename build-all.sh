#!/bin/bash
set -e

echo "🔨 Building Mini-Reddit Vara Contract..."
echo ""

# Build the main contract
echo "📦 Building contract WASM..."
cd contract
cargo build --release --target wasm32-unknown-unknown
cd ..

# Build the metadata
echo "📝 Building metadata WASM..."
cd state
cargo build --release --target wasm32-unknown-unknown
cd ..

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Output files:"
echo "   Contract WASM: contract/target/wasm32-unknown-unknown/release/mini_reddit_contract.wasm"
echo "   Metadata WASM: state/target/wasm32-unknown-unknown/release/mini_reddit_state.meta.wasm"
echo ""
echo "🚀 Next steps:"
echo "   1. Upload mini_reddit_contract.wasm to Gear IDEA"
echo "   2. Upload mini_reddit_state.meta.wasm as metadata"
echo "   3. Copy the program ID and update frontend/.env"
