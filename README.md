# 🚀 Mini-Reddit Vara dApp

A decentralized Reddit-like forum built on the Vara Network where users can create posts and upvote content.

## Features

- ✍️ **Create Posts**: Any user can create text posts (max 280 characters)
- 👍 **Toggle Upvotes**: One upvote per user per post (click again to remove)
- 🔐 **Wallet Integration**: Connect with Polkadot.js extension
- 🎨 **Modern UI**: Beautiful, responsive interface with TailwindCSS
- ⚡ **Real-time Updates**: Automatic state refresh

## Project Structure

```
kudos-wall-vara/
├── io/                    # Type definitions and metadata
│   ├── src/lib.rs        # Action, Event, and State types
│   └── Cargo.toml
├── contract/             # Smart contract
│   ├── src/lib.rs       # Main contract logic
│   ├── build.rs         # Build script
│   └── Cargo.toml
├── frontend/            # React frontend
│   ├── src/
│   │   ├── App.tsx     # Main application
│   │   ├── main.tsx    # Entry point
│   │   └── index.css   # Styles
│   ├── package.json
│   └── vite.config.ts
└── Cargo.toml          # Workspace configuration
```

## Smart Contract

### Actions

```rust
pub enum Action {
    CreatePost { text: String },
    ToggleUpvote { post_id: u64 },
}
```

### Events

```rust
pub enum Event {
    PostCreated { post_id: u64 },
    UpvoteToggled { post_id: u64, upvotes: u32, is_upvoted: bool },
    Error { message: String },
}
```

### State

```rust
pub struct ForumView {
    pub posts: Vec<PostView>,
}

pub struct PostView {
    pub id: u64,
    pub author: ActorId,
    pub text: String,
    pub created_at: u64,
    pub upvotes: u32,
}
```

## Build & Deploy

### Prerequisites

- Rust toolchain (1.91+)
- Node.js and npm/yarn
- Polkadot.js browser extension

### Build the Contract

```bash
# Build with Sails (automatically generates IDL)
cargo build --release

# Output files:
# - mini_reddit_vara.idl (Interface definition)
# - target/wasm32-gear/release/mini_reddit_vara.opt.wasm (Optimized WASM)
# - target/wasm32-gear/release/mini_reddit_vara.wasm (Regular WASM)
```

✅ **This project uses Sails framework** - IDL and optimized WASM are automatically generated!

### Files Generated

After building, you'll have:
- `mini_reddit_vara.idl` - Interface definition (auto-generated)
- `target/wasm32-gear/release/mini_reddit_vara.opt.wasm` - Optimized WASM (31KB)
- `target/wasm32-gear/release/mini_reddit_vara.wasm` - Regular WASM (47KB)

### Deploy to Vara Network

1. **Go to Gear IDEA**: https://idea.gear-tech.io/
2. **Connect Wallet**: Use Polkadot.js extension
3. **Upload Program**:
   - Click "Upload Program"
   - Select `target/wasm32-gear/release/mini_reddit_vara.opt.wasm`
   - **Metadata**: Upload `mini_reddit_vara.idl` (auto-detected)
   - Init payload: Leave empty or `null`
   - Submit transaction
4. **Copy Program ID**: Save the deployed program ID

### Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your program ID
# VITE_PROGRAM_ID=0x...your_program_id_here

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

### Connect Wallet

1. Install [Polkadot.js Extension](https://polkadot.js.org/extension/)
2. Create or import an account
3. Click "Connect Wallet" in the app
4. Approve the connection

### Create a Post

1. Connect your wallet
2. Type your message (max 280 characters)
3. Click "Post" or press Enter
4. Wait for transaction confirmation
5. Your post will appear in the feed

### Upvote Posts

1. Click the upvote arrow on any post
2. Confirm the transaction
3. Click again to remove your upvote

## Network Configuration

**Vara Testnet RPC**: `wss://testnet.vara.network`

To get test tokens:
1. Join [Vara Discord](https://discord.gg/vara-network)
2. Use the faucet bot to get testnet tokens

## Development

### Contract Testing

```bash
# Run tests
cd contract
cargo test
```

### Frontend Development

```bash
cd frontend

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

### Smart Contract
- **Gear Protocol**: Smart contract platform
- **gstd**: Gear standard library
- **Rust**: Programming language

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **@gear-js/api**: Gear API client
- **@polkadot/extension-dapp**: Wallet integration
- **Lucide React**: Icons

## Contract Logic Highlights

### Post Creation
- Validates text is not empty
- Enforces 280 character limit
- Stores author, timestamp, and content
- Emits `PostCreated` event

### Upvote Toggle
- One vote per user per post
- Tracks votes in `BTreeMap<(post_id, voter), ()>`
- Increments/decrements upvote count
- Emits `UpvoteToggled` event with current state

### State Query
- Returns all posts with metadata
- Sorted by creation time
- Includes upvote counts

## Security Considerations

- ✅ Input validation (text length, empty checks)
- ✅ Overflow protection (saturating arithmetic)
- ✅ One vote per user enforcement
- ✅ Immutable post content
- ✅ No admin privileges required

## Sails Framework

This project uses the **Sails framework** for automatic IDL generation and better tooling:

### ✅ Benefits
- **Automatic IDL generation** - No manual interface definitions
- **Optimized WASM** - `.opt.wasm` generated automatically
- **Type-safe** - Strong typing for services and methods
- **Better tooling** - Client generation, testing support
- **Structured** - Service-based architecture

### 📝 IDL File

The `mini_reddit_vara.idl` file is automatically generated and describes:
```idl
service MiniReddit {
  CreatePost : (text: str) -> result (u64, str);
  ToggleUpvote : (post_id: u64) -> result (struct { u32, bool }, str);
  query GetAllPosts : () -> vec Post;
};
```

This file is used by:
- Gear IDEA for UI generation
- Frontend clients for type safety
- Documentation tools

## Future Enhancements

- 💬 Comments on posts
- 🏷️ Tags and categories
- 🔍 Search functionality
- 👤 User profiles
- 📊 Sorting (hot, new, top)
- ⏰ Time-based post expiry
- 🎯 Downvotes
- 🔄 Migrate to Sails for automatic IDL generation

## License

MIT

## Resources

- [Vara Network Docs](https://wiki.vara.network/)
- [Gear Protocol](https://gear-tech.io/)
- [Polkadot.js](https://polkadot.js.org/)
- [Gear IDEA](https://idea.gear-tech.io/)

---

Built with ❤️ on Vara Network
# minireddit-on-vara
