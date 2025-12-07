# Lumio Social - Decentralized Open Social Network on Vara

A decentralized social media platform built on the Vara Network where users can create posts, comment, upvote, and earn $VIBES rewards for their engagement.

![Lumio Social](https://img.shields.io/badge/Lumio%20Social-Vara%20Network-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- 📝 **Create Posts**: Share your thoughts with up to 500 characters
- 💬 **Comments & Replies**: Engage in conversations with nested comment threads
- 👍 **Upvote System**: Show appreciation for posts and comments
- 💰 **$VIBES Rewards**: Earn tokens for your activity:
  - 50 $VIBES for creating a post
  - 25 $VIBES for commenting
  - 10 $VIBES for upvoting posts/comments
- 👤 **User Profiles**: Customize your profile with username, handle, avatar, and bio
- 🖼️ **Image Support**: Upload images to posts and comments via IPFS
- 📊 **Leaderboard**: Track your $VIBES earnings and activity stats
- 🔐 **Wallet Integration**: Connect with Polkadot.js extension

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Posts UI   │  │  Comments UI │  │  Profile UI  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         @gear-js/api + Sails Client                 │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vara Network (Blockchain)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Lumio Social Smart Contract (Rust/Sails)        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │  │
│  │  │ MiniReddit   │  │   Session    │  │  State   │  │  │
│  │  │  Service     │  │   Service    │  │  Query   │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    IPFS (Pinata)                             │
│              Image Storage & Retrieval                       │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Smart Contract
- **Rust** with **Sails Framework** (v0.8.0)
- **Gear Protocol** for blockchain execution
- **Session Service** for signless transactions (optional)

### Frontend
- **React 19** with **TypeScript**
- **Vite** for fast builds
- **SCSS** for styling
- **@gear-js/api** for blockchain interaction
- **Sails Client** for type-safe contract calls
- **IPFS/Pinata** for image storage

## 📦 Project Structure

```
lumio-social/
├── app/                    # Smart contract (Sails)
│   ├── src/lib.rs         # Main contract logic
│   └── Cargo.toml
├── client/                 # Generated TypeScript client
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   └── utils/         # Utilities (IPFS, etc.)
│   └── package.json
├── target
    ├── ...
    └── wasm32-gear
        └── release
            ├── lumio-social.wasm       <---- this is our built .wasm file
            ├── lumio-social.opt.wasm   <---- this is optimized .wasm file
            └── lumio-social.idl        <---- this is our application interface .idl file
└── Cargo.toml            # Workspace configuration
```

## 🚀 Quick Start

### Prerequisites

- **Rust** (1.91+)
- **Node.js** (18+)
- **Polkadot.js Extension** (for wallet)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/lumio-social.git
cd lumio-social
```

### 2. Build Smart Contract

```bash
# Build the contract
cargo build --release

# Output files:
#wasm32-gear
        └── release
            ├── lumio-social.wasm       <---- this is our built .wasm file
            ├── lumio-social.opt.wasm   <---- this is optimized .wasm file
            └── lumio-social.idl        <---- this is our application interface .idl file
```

### 3. Deploy Contract

1. Go to [Gear IDEA](https://idea.gear-tech.io/)
2. Connect your wallet
3. Upload `target/wasm32-gear/release/lumio-social.opt.wasm`
4. Copy the Program ID

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_NODE_ADDRESS=wss://testnet.vara.network
VITE_PROGRAM_ID=0x...your_program_id_here
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
VITE_PINATA_JWT=your_pinata_jwt
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
EOF

# Start development server
npm run dev
```

## 🌐 Deployment

### Vercel Deployment

1. **Import Project** to Vercel
2. **Set Root Directory**: `frontend`
3. **Add Environment Variables**:
- `VITE_PROGRAM_ID=0x0617121506174a7eb159967337d86488e68fafa085d697c2577b98e3b5d93398`
- `VITE_NODE_ADDRESS=wss://testnet.vara.network`
   - `VITE_NODE_ADDRESS`
   - `VITE_PROGRAM_ID`
   - `VITE_PINATA_API_KEY`
   - `VITE_PINATA_SECRET_KEY`
   - `VITE_PINATA_JWT`
   - `VITE_PINATA_GATEWAY`
5. **Deploy**

See `VERCEL_DEPLOYMENT.md` for detailed instructions.

## 💡 How It Works

### Post Creation Flow
1. User writes post (max 500 chars) and optionally uploads image
2. Image uploaded to IPFS via Pinata
3. Transaction sent to Lumio Social contract
4. Contract validates and stores post
5. User earns 50 $VIBES (tracked locally)
6. Post appears in feed

### Comment System
- Users can comment on posts
- Nested replies supported (unlimited depth)
- Each comment earns 25 $VIBES
- Upvoting comments earns 10 $VIBES

### Profile System
- Customizable username, handle, avatar, and bio
- Profiles stored on-chain
- Avatar images stored on IPFS
- Profile data displayed in posts and comments

### $VIBES Rewards
- **Posts**: 50 $VIBES per post
- **Comments**: 25 $VIBES per comment
- **Upvotes**: 10 $VIBES per upvote (posts or comments)
- Rewards tracked locally per user per contract deployment

## 📊 Contract Services

### MiniReddit Service
- `createPost(text, image_uri, session_for_account)` - Create a new post
- `toggleUpvote(post_id, session_for_account)` - Toggle upvote on post
- `createComment(post_id, parent_id, text, image_uri, session_for_account)` - Add comment
- `toggleCommentUpvote(comment_id, session_for_account)` - Toggle comment upvote
- `updateProfile(username, social_handle, description, avatar_uri, session_for_account)` - Update profile
- `getAllPosts()` - Query all posts
- `getCommentsForPost(post_id)` - Query comments for a post
- `getProfile(wallet)` - Query user profile
- `getVibesBalance(wallet)` - Query user's vibes balance

### Session Service
- `createSession(signature_data, signature)` - Create signless session
- `deleteSessionFromAccount()` - Delete user's session
- `sessionForTheAccount(account)` - Query session data

## 🔒 Security

- ✅ Input validation (text length limits)
- ✅ Overflow protection
- ✅ One vote per user enforcement
- ✅ Immutable post/comment content
- ✅ Session-based authorization (optional)
- ✅ IPFS content addressing

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Resources

- [Vara Network Docs](https://wiki.vara.network/)
- [Gear Protocol](https://gear-tech.io/)
- [Sails Framework](https://github.com/gear-foundation/sails-rs)
- [Gear IDEA](https://idea.gear-tech.io/)
- [Pinata IPFS](https://www.pinata.cloud/)

## 📧 Contact

Built with ❤️ on Vara Network

---

**Note**: This project uses the Sails framework for automatic IDL generation and optimized WASM builds.
