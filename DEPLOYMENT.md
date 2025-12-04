# Deployment Guide

## Files Overview

After building, you'll have these key files:

```
kudos-wall-vara/
├── mini_reddit.idl                    # ✅ Interface definition (provided)
└── contract/
    └── target/wasm32-unknown-unknown/release/
        └── mini_reddit_contract.wasm  # ✅ Contract binary (built)
```

## What is the .idl file?

The `.idl` (Interface Definition Language) file describes your contract's interface:
- Available actions (CreatePost, ToggleUpvote)
- Expected inputs and outputs
- State structure
- Type definitions

**In this project**: The `mini_reddit.idl` file is manually created since we use the traditional gstd approach.

**With Sails**: The `.idl` file is automatically generated during build.

## Deployment Steps

### 1. Build the Contract

```bash
cd contract
cargo build --release --target wasm32-unknown-unknown
```

### 2. Go to Gear IDEA

Visit: https://idea.gear-tech.io/

### 3. Connect Wallet

- Install Polkadot.js extension
- Create/import account
- Connect to Vara Testnet

### 4. Upload Program

1. Click **"Upload Program"**
2. Select: `contract/target/wasm32-unknown-unknown/release/mini_reddit_contract.wasm`
3. **Metadata** (optional): Upload `mini_reddit.idl` or skip
4. **Init payload**: Leave empty or use `null`
5. **Gas limit**: Auto-calculate
6. Click **"Submit"**

### 5. Copy Program ID

After deployment, copy the Program ID (looks like: `0x1234...abcd`)

### 6. Configure Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env and add:
# VITE_PROGRAM_ID=0x...your_program_id_here
```

### 7. Install & Run Frontend

```bash
npm install
npm run dev
```

Visit: http://localhost:3000

## Testing the Contract

### Send Messages

**Create Post:**
```json
{
  "CreatePost": {
    "text": "Hello Vara!"
  }
}
```

**Toggle Upvote:**
```json
{
  "ToggleUpvote": {
    "post_id": 0
  }
}
```

### Read State

Click **"Read State"** in Gear IDEA to see all posts.

## Get Testnet Tokens

1. Join Vara Discord: https://discord.gg/vara-network
2. Use faucet bot: `/faucet <your_address>`
3. Wait for tokens to arrive

## Troubleshooting

### Contract won't upload
- Check you have enough testnet tokens
- Verify WASM file exists
- Try increasing gas limit

### Frontend can't connect
- Verify Program ID in `.env`
- Check RPC endpoint: `wss://testnet.vara.network`
- Ensure Polkadot.js extension is installed

### Transactions fail
- Check you have testnet tokens
- Verify wallet is connected
- Check browser console for errors

## Network Info

- **Network**: Vara Testnet
- **RPC**: `wss://testnet.vara.network`
- **Explorer**: https://idea.gear-tech.io/programs
- **Faucet**: Discord bot

## Next Steps

1. ✅ Deploy contract
2. ✅ Configure frontend
3. ✅ Create first post
4. ✅ Test upvoting
5. 🚀 Share with others!

---

Need help? Check the [main README](./README.md) or visit [Vara Docs](https://wiki.vara.network/)
