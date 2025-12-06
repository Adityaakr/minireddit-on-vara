# VibePost - Vercel Deployment Guide

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Adityaakr/minireddit-on-vara)

## Manual Deployment Steps

### 1. Import Project to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository: `Adityaakr/minireddit-on-vara`

### 2. Configure Build Settings

**Root Directory:** `frontend`

**Build Settings:**
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install` (will use `.npmrc` automatically)

### 3. Environment Variables

Add these in Vercel → Settings → Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_NODE_ADDRESS` | `wss://testnet.vara.network` | Vara network WebSocket endpoint |
| `VITE_PROGRAM_ID` | `0x02347b94a2af6ea0e555704e4bcd20fb3a64787342cc1f67706d76684998a4a4` | Your deployed contract address |

### 4. Deploy

Click "Deploy" and Vercel will:
1. Clone your repository
2. Install dependencies (using `--legacy-peer-deps` from `.npmrc`)
3. Build the production bundle
4. Deploy to a global CDN

## Build Configuration

The project includes:
- ✅ `.npmrc` with `legacy-peer-deps=true` for dependency resolution
- ✅ `vercel.json` with optimal caching and routing
- ✅ Production-ready build (gzipped assets)
- ✅ Mobile-responsive design

## Expected Build Time
~2-3 minutes (blockchain dependencies are large but tree-shaken)

## Post-Deployment
Your VibePost dApp will be live at: `https://your-project.vercel.app`

## Troubleshooting

**Build fails with dependency errors:**
- Ensure `.npmrc` is committed to git
- Check environment variables are set correctly

**Blank page after deploy:**
- Verify `VITE_NODE_ADDRESS` and `VITE_PROGRAM_ID` are set
- Check browser console for connection errors

**Large bundle warning:**
- This is normal for Polkadot/Vara apps (2.9 MB gzips to 2.2 MB)
- Assets are cached and load quickly

## Tech Stack
- ⚡ Vite
- ⚛️ React 19
- 🎨 SCSS
- 🔗 Vara Network
- 🌐 Vercel


