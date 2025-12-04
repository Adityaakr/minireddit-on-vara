# 🎨 Frontend Setup Guide

## Overview

The frontend uses:
- ✅ **Vara Template** - Official Gear Foundation template with wallet integration
- ✅ **TypeScript Client** - Auto-generated from IDL using `sails-js-cli`
- ✅ **Type-safe API** - Full type safety for contract interactions
- ✅ **Modern UI** - React 19 + Vara UI components

## 📦 Installation

```bash
cd frontend
npm install
```

## 🔧 Configuration

1. **Copy environment file:**
```bash
cp .env.example .env
```

2. **Edit `.env` file:**
```env
VITE_NODE_ADDRESS=wss://testnet.vara.network
VITE_PROGRAM_ID=0x...your_deployed_program_id_here
```

## 🚀 Running the App

```bash
npm start
```

The app will open at http://localhost:3000

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   └── utils/
│   │       └── src/
│   │           ├── lib.ts          # ✨ Generated TypeScript client
│   │           └── global.d.ts     # Type definitions
│   ├── pages/
│   │   └── mini-reddit/
│   │       ├── MiniReddit.tsx      # Main Mini Reddit component
│   │       ├── mini-reddit.scss    # Styles
│   │       └── index.ts
│   ├── components/                  # Vara UI components (header, footer, etc.)
│   ├── hooks/                       # React hooks from @gear-js
│   └── consts.ts                    # Environment constants
├── .env                             # Environment variables
└── package.json
```

## 🔑 Generated TypeScript Client

The client was generated using:
```bash
npx sails-js-cli generate mini_reddit_vara.idl -o frontend/src/app/utils
```

### Usage Example

```typescript
import { SailsProgram } from '@/app/utils/src/lib';
import { useApi, useAccount } from '@gear-js/react-hooks';

// Initialize
const { api } = useApi();
const { account } = useAccount();
const program = new SailsProgram(api, programId);

// Create post
const transaction = program.miniReddit.createPost("Hello Vara!");
await transaction
  .withAccount(account.address, { signer: account.signer })
  .calculateGas()
  .signAndSend();

// Toggle upvote
const tx = program.miniReddit.toggleUpvote(postId);
await tx
  .withAccount(account.address, { signer: account.signer })
  .calculateGas()
  .signAndSend();

// Query posts (read-only)
const posts = await program.miniReddit.getAllPosts().query();
```

## 🎯 Features

### Wallet Integration
- ✅ Polkadot.js extension support
- ✅ Account selection
- ✅ Transaction signing
- ✅ Balance display

### Mini Reddit Features
- ✅ Create posts (max 280 chars)
- ✅ Toggle upvotes
- ✅ View all posts
- ✅ Real-time updates
- ✅ Author display
- ✅ Timestamp formatting

### Type Safety
```typescript
// All methods are fully typed!
interface Post {
  id: bigint;
  author: string;
  text: string;
  created_at: bigint;
  upvotes: number;
}

// Transaction builders with proper return types
createPost(text: string): TransactionBuilder<{ ok: bigint } | { err: string }>
toggleUpvote(post_id: bigint): TransactionBuilder<{ ok: [number, boolean] } | { err: string }>
getAllPosts(): QueryBuilder<Array<Post>>
```

## 🔄 Regenerating the Client

If you update the contract and rebuild:

```bash
# 1. Rebuild contract (generates new IDL)
cd ..
cargo build --release

# 2. Regenerate TypeScript client
cd frontend
npx sails-js-cli generate ../mini_reddit_vara.idl -o src/app/utils
```

## 🎨 Customization

### Styling
Edit `src/pages/mini-reddit/mini-reddit.scss` to customize the UI.

### Add Features
The generated client provides all contract methods. Simply import and use:

```typescript
import { SailsProgram } from '@/app/utils/src/lib';

// Access the service
program.miniReddit.createPost(...)
program.miniReddit.toggleUpvote(...)
program.miniReddit.getAllPosts()
```

## 🐛 Troubleshooting

### "Program ID not set"
- Make sure `.env` file exists with `VITE_PROGRAM_ID`
- Restart the dev server after changing `.env`

### "Failed to connect"
- Check `VITE_NODE_ADDRESS` is correct
- Ensure you're connected to the internet
- Try: `wss://testnet.vara.network`

### "No accounts found"
- Install Polkadot.js extension
- Create/import an account
- Grant access to the dApp

### Transaction fails
- Check you have testnet tokens
- Get tokens from Discord faucet: `/faucet <address>`
- Ensure program is deployed correctly

## 📚 Resources

- **Vara Docs**: https://wiki.vara.network/
- **Gear-JS API**: https://github.com/gear-tech/gear-js
- **Sails-JS**: https://github.com/gear-tech/sails/tree/master/js
- **Template Source**: https://github.com/gear-foundation/dapps/tree/master/frontend/templates/create-vara-app

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

### Deploy to Vercel/Netlify

1. Connect your GitHub repo
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables:
   - `VITE_NODE_ADDRESS`
   - `VITE_PROGRAM_ID`

---

**Ready to go!** 🎉 Your Mini Reddit dApp is fully integrated with type-safe contract interactions!
