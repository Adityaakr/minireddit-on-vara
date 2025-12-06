import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useApi } from '@gear-js/react-hooks';
import { useNavigate } from 'react-router-dom';
import { Button } from '@gear-js/vara-ui';
import { decodeAddress } from '@gear-js/api';

import { SailsProgram } from '@/app/utils/src/lib';
import { ENV } from '@/consts';
import { CommentSection } from '@/components/comments';
import { ProfileModal } from '@/components/profile';
import { uploadToIPFS, compressImage, formatAddress, getIPFSUrl } from '@/utils';

import './mini-reddit.scss';

interface RawPost {
  id: string | number | bigint;
  author: Uint8Array | number[];
  text: string;
  image_uri?: string | null;
  created_at: string | number | bigint;
  upvotes: number;
  comment_count?: number;
}

interface Post {
  id: bigint;
  author: string;
  text: string;
  image_uri: string | null;
  created_at: bigint;
  upvotes: number;
  comment_count: number;
}

interface RawComment {
  id: string | number | bigint;
  post_id: string | number | bigint;
  parent_id?: string | number | bigint | null;
  author: Uint8Array | number[];
  text: string;
  image_uri?: string | null;
  created_at: string | number | bigint;
  upvotes: number;
  reply_count?: number;
}

interface Comment {
  id: bigint;
  post_id: bigint;
  parent_id: bigint | null;
  author: string;
  text: string;
  image_uri: string | null;
  created_at: bigint;
  upvotes: number;
  reply_count: number;
}

interface Profile {
  wallet: string;
  username?: string | null;
  social_handle?: string | null;
  description?: string | null;
  avatar_uri?: string | null;
  created_at: bigint;
  total_posts: number;
  total_vibes_earned: bigint;
}

export function MiniReddit() {
  const { api, isApiReady } = useApi();
  const { account } = useAccount();
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Map<bigint, Comment[]>>(new Map());
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [vibesBalance, setVibesBalance] = useState<number>(0);
  // Local tracking of vibes earned for actions not tracked by contract
  const [localVibesEarned, setLocalVibesEarned] = useState<number>(0);
  // Track which posts have expanded text
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  // Type for vibes earned data stored in localStorage
  interface VibesEarnedData {
    contractAddress?: string; // Track which contract this data belongs to
    posts: string[];
    comments: string[];
    upvotedPosts: string[];
    upvotedComments: string[];
  }

  // Helper function to safely parse and validate vibes earned data
  const parseVibesEarnedData = (stored: string | null, currentContractAddress: string | null): VibesEarnedData => {
    const defaultData: VibesEarnedData = { posts: [], comments: [], upvotedPosts: [], upvotedComments: [] };
    if (!stored) return defaultData;
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (parsed && typeof parsed === 'object') {
        const data = parsed as Record<string, unknown>;
        const storedContractAddress = typeof data.contractAddress === 'string' ? data.contractAddress : null;
        
        // If contract address doesn't match, reset to default (new contract = fresh start)
        if (currentContractAddress && storedContractAddress !== currentContractAddress) {
          return defaultData;
        }
        
        return {
          contractAddress: storedContractAddress || currentContractAddress || undefined,
          posts: Array.isArray(data.posts) ? data.posts.filter((item): item is string => typeof item === 'string') : [],
          comments: Array.isArray(data.comments) ? data.comments.filter((item): item is string => typeof item === 'string') : [],
          upvotedPosts: Array.isArray(data.upvotedPosts) ? data.upvotedPosts.filter((item): item is string => typeof item === 'string') : [],
          upvotedComments: Array.isArray(data.upvotedComments) ? data.upvotedComments.filter((item): item is string => typeof item === 'string') : [],
        };
      }
    } catch {
      // Invalid JSON, return default
    }
    return defaultData;
  };
  
  // Helper function to save vibes data with contract address
  const saveVibesEarnedData = (accountAddress: string, data: VibesEarnedData, contractAddress: string | null) => {
    const dataToSave: VibesEarnedData = {
      ...data,
      contractAddress: contractAddress || undefined,
    };
    localStorage.setItem(`vibes_earned_${accountAddress}`, JSON.stringify(dataToSave));
  };
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vibesEarnedNotification, setVibesEarnedNotification] = useState<number | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const program = useMemo(() => {
    if (api && ENV.PROGRAM_ID) {
      return new SailsProgram(api, ENV.PROGRAM_ID as `0x${string}`);
    }
    return null;
  }, [api]);

  const loadPosts = async () => {
    if (!program || !api) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await program.miniReddit.getAllPosts().call();

      const rawPosts = result as unknown as RawPost[];

      const formattedPosts: Post[] = rawPosts.map((p) => {
        // Convert author bytes to hex, ensuring it's exactly 32 bytes
        const authorBytes = Array.isArray(p.author) ? new Uint8Array(p.author) : p.author;
        // Take only first 32 bytes if longer
        const author32Bytes = authorBytes.length > 32 ? authorBytes.slice(0, 32) : authorBytes;
        // Pad with zeros if shorter than 32 bytes
        let paddedAuthor: Uint8Array;
        if (author32Bytes.length < 32) {
          const paddingLength = 32 - author32Bytes.length;
          const padding = new Array<number>(paddingLength).fill(0);
          paddedAuthor = new Uint8Array([...Array.from(author32Bytes), ...padding]);
        } else {
          paddedAuthor = author32Bytes;
        }
        
        return {
          id: BigInt(p.id),
          author: `0x${Buffer.from(paddedAuthor).toString('hex')}`.toLowerCase(),
          text: p.text,
          image_uri: p.image_uri || null,
          created_at: BigInt(p.created_at),
          upvotes: Number(p.upvotes),
          comment_count: Number(p.comment_count || 0),
        };
      });
      
      setPosts(formattedPosts);

      // Load comments for all posts and collect all authors
      const allCommentAuthors = new Set<string>();
      for (const post of formattedPosts) {
        const commentsResult = await program.miniReddit.getCommentsForPost(post.id).call();
        const rawComments = commentsResult as unknown as RawComment[];
        
        const formattedComments: Comment[] = rawComments.map((c) => {
          // Convert author bytes to hex, ensuring it's exactly 32 bytes
          const authorBytes = Array.isArray(c.author) ? new Uint8Array(c.author) : c.author;
          const author32Bytes = authorBytes.length > 32 ? authorBytes.slice(0, 32) : authorBytes;
          let paddedAuthor: Uint8Array;
          if (author32Bytes.length < 32) {
            const paddingLength = 32 - author32Bytes.length;
            const padding = new Array<number>(paddingLength).fill(0);
            paddedAuthor = new Uint8Array([...Array.from(author32Bytes), ...padding]);
          } else {
            paddedAuthor = author32Bytes;
          }
          
          const commentAuthor = `0x${Buffer.from(paddedAuthor).toString('hex')}`.toLowerCase();
          if (commentAuthor && commentAuthor.length >= 64) {
            allCommentAuthors.add(commentAuthor);
          }
          
          return {
            id: BigInt(c.id),
            post_id: BigInt(c.post_id),
            parent_id: c.parent_id ? BigInt(c.parent_id) : null,
            author: commentAuthor,
            text: c.text,
            image_uri: c.image_uri || null,
            created_at: BigInt(c.created_at),
            upvotes: Number(c.upvotes),
            reply_count: Number(c.reply_count || 0),
          };
        });
        
        setComments(prev => {
          const newMap = new Map(prev);
          newMap.set(post.id, formattedComments);
          return newMap;
        });
      }

      // Collect ALL unique authors from posts AND comments
      const uniqueAuthors = new Set<string>();
      
      // Add all post authors
      formattedPosts.forEach(post => {
        if (post.author && post.author.length >= 64) {
          uniqueAuthors.add(post.author);
        }
      });
      
      // Add all comment authors
      allCommentAuthors.forEach(author => {
        if (author && author.length >= 64) {
          uniqueAuthors.add(author);
        }
      });
      
      // Also include current user's profile if they have an account
      if (account) {
        try {
          const accountBytes = decodeAddress(account.address);
          const accountHex = `0x${Buffer.from(accountBytes).toString('hex')}`.toLowerCase();
          uniqueAuthors.add(accountHex);
        } catch (e) {
          console.error('[Load Posts] Failed to convert account address:', e);
        }
      }
      
      // Load ALL profiles in parallel - this ensures we have profiles for everyone on the platform
      if (uniqueAuthors.size > 0) {
        // Load all profiles in parallel with better error handling
        const profilePromises = Array.from(uniqueAuthors).map(async (author) => {
          try {
            await loadProfile(author);
          } catch (err) {
            // Silently fail for individual profile loads
          }
        });
        
        await Promise.all(profilePromises);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (postId: bigint) => {
    if (!program) return;

    try {
      const result = await program.miniReddit.getCommentsForPost(postId).call();
      const rawComments = result as unknown as RawComment[];

      const formattedComments: Comment[] = rawComments.map((c) => {
        // Convert author bytes to hex, ensuring it's exactly 32 bytes
        const authorBytes = Array.isArray(c.author) ? new Uint8Array(c.author) : c.author;
        const author32Bytes = authorBytes.length > 32 ? authorBytes.slice(0, 32) : authorBytes;
        let paddedAuthor: Uint8Array;
        if (author32Bytes.length < 32) {
          const paddingLength = 32 - author32Bytes.length;
          const padding = new Array<number>(paddingLength).fill(0);
          paddedAuthor = new Uint8Array([...Array.from(author32Bytes), ...padding]);
        } else {
          paddedAuthor = author32Bytes;
        }
        
        return {
          id: BigInt(c.id),
          post_id: BigInt(c.post_id),
          parent_id: c.parent_id ? BigInt(c.parent_id) : null,
          author: `0x${Buffer.from(paddedAuthor).toString('hex')}`.toLowerCase(),
          text: c.text,
          image_uri: c.image_uri || null,
          created_at: BigInt(c.created_at),
          upvotes: Number(c.upvotes),
          reply_count: Number(c.reply_count || 0),
        };
      });

      setComments(prev => {
        const newMap = new Map(prev);
        newMap.set(postId, formattedComments);
        return newMap;
      });

      // Load profiles for all comment authors (including nested replies)
      const commentAuthors = new Set<string>();
      formattedComments.forEach(comment => {
        if (comment.author && comment.author.length >= 64) {
          commentAuthors.add(comment.author);
        }
      });
      
      if (commentAuthors.size > 0) {
        // Load all profiles in parallel
        await Promise.all(Array.from(commentAuthors).map(author => loadProfile(author)));
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  // Helper function to convert any wallet address format to hex
  const walletToHex = (wallet: string): string | null => {
    if (!wallet || wallet.trim().length === 0) return null;
    
    const normalized = wallet.toLowerCase().trim();
    
    // If already hex format, validate and return
    if (normalized.startsWith('0x')) {
      const hexString = normalized.slice(2);
      if (hexString.length === 64 && /^[0-9a-f]+$/.test(hexString)) {
        return normalized;
      }
      // If longer, take first 64 chars
      if (hexString.length > 64 && /^[0-9a-f]+$/.test(hexString.slice(0, 64))) {
        return `0x${hexString.slice(0, 64)}`;
      }
    }
    
    // Try to decode as SS58 address
    try {
      const walletBytes = decodeAddress(normalized);
      if (walletBytes.length === 32) {
        return `0x${Buffer.from(walletBytes).toString('hex')}`.toLowerCase();
      }
    } catch (e) {
      // If SS58 decode fails, try as hex without 0x
      if (normalized.length === 64 && /^[0-9a-f]+$/.test(normalized)) {
        return `0x${normalized}`;
      }
    }
    
    return null;
  };

  // Helper function to find profile by wallet address (tries multiple lookup strategies)
  const findProfile = useCallback((wallet: string): Profile | null => {
    if (!wallet) return null;
    
    const normalized = wallet.toLowerCase().trim();
    const hexAddress = walletToHex(normalized);
    
    // Strategy 1: Direct lookup with normalized input
    let profile = profiles.get(normalized);
    if (profile) return profile;
    
    // Strategy 2: Lookup with hex address
    if (hexAddress) {
      profile = profiles.get(hexAddress);
      if (profile) return profile;
    }
    
    // Strategy 3: Find by matching wallet field
    for (const [key, p] of profiles.entries()) {
      if (p.wallet.toLowerCase() === normalized || 
          (hexAddress && p.wallet.toLowerCase() === hexAddress)) {
        return p;
      }
    }
    
    // Strategy 4: Prefix matching (first 20 chars)
    if (normalized.length >= 20) {
      const prefix = normalized.slice(0, 20);
      for (const [key, p] of profiles.entries()) {
        if (key.startsWith(prefix) || p.wallet.toLowerCase().startsWith(prefix)) {
          return p;
        }
      }
    }
    
    return null;
  }, [profiles]);

  const loadProfile = async (wallet: string) => {
    if (!program) return;

    try {
      // Skip empty or invalid wallet addresses
      if (!wallet || wallet.trim().length === 0) {
        return;
      }

      // Convert wallet to bytes - handle both SS58 and hex formats
      let walletBytes: Uint8Array;
      if (wallet.startsWith('0x')) {
        // Hex format - already in hex, just convert to bytes
        const hexString = wallet.slice(2);
        if (hexString.length !== 64) {
          return; // Invalid hex length
        }
        walletBytes = new Uint8Array(Buffer.from(hexString, 'hex'));
      } else {
        // SS58 format - decode it (same as Profile page)
        try {
          walletBytes = decodeAddress(wallet) as unknown as Uint8Array;
        } catch (e) {
          return; // Invalid SS58 address
        }
      }
      
      if (walletBytes.length !== 32) {
        return; // Invalid length
      }
      
      // Convert to hex string for API call (same as Profile page)
      const walletHex = `0x${Buffer.from(walletBytes).toString('hex')}`;
      
      // Call contract to get profile - EXACT same way as Profile page does
      const result = await program.miniReddit.getProfile(walletHex as `0x${string}`).call();
      
      // Convert wallet bytes to hex for storage key (always use hex for consistency)
      const profileWalletHex = `0x${Buffer.from(walletBytes).toString('hex')}`.toLowerCase();
      
      if (result) {
        // Extract profile data - EXACT same way as Profile page does
        const profile: Profile = {
          wallet: `0x${Buffer.from(result.wallet).toString('hex')}`.toLowerCase(),
          username: result.username || null,
          social_handle: result.social_handle || null,
          description: result.description || null,
          avatar_uri: result.avatar_uri || null,
          created_at: BigInt(result.created_at),
          total_posts: Number(result.total_posts),
          total_vibes_earned: BigInt(result.total_vibes_earned || 0),
        };
        
        // Always store the latest data from blockchain
        setProfiles(prev => {
          const newMap = new Map(prev);
          
          // Store with hex address as primary key
          newMap.set(profileWalletHex, profile);
          newMap.set(profileWalletHex.toLowerCase(), profile);
          
          // Also store with profile's wallet address
          newMap.set(profile.wallet, profile);
          newMap.set(profile.wallet.toLowerCase(), profile);
          
          // Store with original wallet format (for SS58 or hex lookup)
          newMap.set(wallet.toLowerCase(), profile);
          newMap.set(wallet, profile);
          
          
          return new Map(newMap);
        });
      } else {
        // No profile found - only store null profile if we don't already have one
        setProfiles(prev => {
          const newMap = new Map(prev);
          // Don't overwrite existing profile with null
          if (!newMap.has(profileWalletHex)) {
            newMap.set(profileWalletHex, {
              wallet: profileWalletHex,
              username: null,
              social_handle: null,
              description: null,
              avatar_uri: null,
              created_at: BigInt(0),
              total_posts: 0,
              total_vibes_earned: BigInt(0),
            });
          }
          return new Map(newMap);
        });
      }
    } catch (err) {
      // Silently fail - don't spam console for missing profiles
      // console.error(`[Profile Load] Failed to load profile for ${wallet}:`, err);
    }
  };

  // Dedicated function to load all profiles for all users on the platform
  const loadAllProfiles = async () => {
    if (!program) return;
    
    // Collect all unique authors from posts and comments
    const uniqueAuthors = new Set<string>();
    
    // Add all post authors
    posts.forEach(post => {
      if (post.author && post.author.length >= 64) {
        uniqueAuthors.add(post.author);
      }
    });
    
    // Add all comment authors
    comments.forEach(commentList => {
      commentList.forEach(comment => {
        if (comment.author && comment.author.length >= 64) {
          uniqueAuthors.add(comment.author);
        }
      });
    });
    
    // Add current user if connected
    if (account) {
      try {
        const accountBytes = decodeAddress(account.address);
        const accountHex = `0x${Buffer.from(accountBytes).toString('hex')}`.toLowerCase();
        uniqueAuthors.add(accountHex);
      } catch (e) {
        // Ignore
      }
    }
    
    if (uniqueAuthors.size === 0) {
      return;
    }
    
    // Load all profiles in batches to avoid overwhelming the network
    const authorsArray = Array.from(uniqueAuthors);
    const batchSize = 10;
    
    for (let i = 0; i < authorsArray.length; i += batchSize) {
      const batch = authorsArray.slice(i, i + batchSize);
      await Promise.all(batch.map(author => loadProfile(author)));
    }
  };

  const loadVibesBalance = async () => {
    if (!program || !account) return;

    try {
      const walletBytes = decodeAddress(account.address);
      const result = await program.miniReddit.getVibesBalance(walletBytes).call();
      setVibesBalance(Number(result));
    } catch (err) {
      console.error('Failed to load vibes balance:', err);
    }
  };

  useEffect(() => {
    if (program) {
      void loadPosts();
    }
  }, [program]);

  // Load profiles for all post and comment authors when posts/comments change
  // This ensures profiles are loaded even if they weren't loaded initially
  useEffect(() => {
    if (program && (posts.length > 0 || comments.size > 0)) {
      // Use the dedicated loadAllProfiles function
      void loadAllProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, posts, comments, account]);

  // Load local vibes earned from localStorage on mount and calculate total
  useEffect(() => {
    if (account && program) {
      const contractAddress = ENV.PROGRAM_ID;
      const stored = localStorage.getItem(`vibes_earned_${account.address}`);
      const data = parseVibesEarnedData(stored, contractAddress);
      const totalVibes = data.posts.length * 50 + data.comments.length * 25 + data.upvotedPosts.length * 10 + data.upvotedComments.length * 10;
      setLocalVibesEarned(totalVibes);
      
      // If contract address wasn't set, save it now
      if (!data.contractAddress && contractAddress) {
        saveVibesEarnedData(account.address, data, contractAddress);
      }
    } else {
      setLocalVibesEarned(0);
    }
  }, [account, program]);

  useEffect(() => {
    if (program && account) {
      // Load profile the EXACT same way as Profile page does
      const loadCurrentUserProfile = async () => {
        try {
          const walletBytes = decodeAddress(account.address);
          const result = await program.miniReddit.getProfile(walletBytes).call();
          
          if (result) {
            const profileData: Profile = {
              wallet: `0x${Buffer.from(result.wallet).toString('hex')}`.toLowerCase(),
              username: result.username || null,
              social_handle: result.social_handle || null,
              description: result.description || null,
              avatar_uri: result.avatar_uri || null,
              created_at: BigInt(result.created_at),
              total_posts: Number(result.total_posts),
              total_vibes_earned: BigInt(result.total_vibes_earned || 0),
            };
            
            // Store with both hex and SS58 keys
            setProfiles(prev => {
              const newMap = new Map(prev);
              const hexKey = profileData.wallet;
              newMap.set(hexKey, profileData);
              newMap.set(account.address.toLowerCase(), profileData);
              return new Map(newMap);
            });
          }
        } catch (err) {
          console.error('[Init] Failed to load current user profile:', err);
        }
      };
      
      void loadCurrentUserProfile();
      // Also try the general loadProfile as backup
      void loadProfile(account.address);
    }
  }, [program, account]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);
      
      // Compress image first
      const compressed = await compressImage(file);
      
      // Upload to IPFS
      const uri = await uploadToIPFS(compressed);
      
      setNewPostImage(uri);
      setNewPostImagePreview(URL.createObjectURL(file));
    } catch (err) {
      console.error('Failed to upload image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image. Please try again.';
      setError(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setNewPostImage(null);
    setNewPostImagePreview(null);
  };

  const handleCreatePost = async () => {
    if (!program || !account) {
      setError('Please connect your wallet');
      return;
    }

    if (!newPostText.trim() && !newPostImage) {
      setError('Post must have text or image');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const transaction = program.miniReddit.createPost(newPostText, newPostImage, null);
      
      const result = await transaction
        .withAccount(account.address, { signer: account.signer })
        .calculateGas()
        .then((tx: { signAndSend: () => Promise<unknown> }) => tx.signAndSend());

      // Show notification for vibes earned (50 for posting)
      const vibesEarned = 50;
      setVibesEarnedNotification(vibesEarned);
      setTimeout(() => setVibesEarnedNotification(null), 5000);

      // Track post locally with fixed 50 vibes reward
      if (account) {
        const contractAddress = ENV.PROGRAM_ID;
        const stored = localStorage.getItem(`vibes_earned_${account.address}`);
        const data = parseVibesEarnedData(stored, contractAddress);
        const postId = `post_${Date.now()}`;
        data.posts.push(postId);
        
        saveVibesEarnedData(account.address, data, contractAddress);
        
        // Calculate total vibes
        const totalVibes = data.posts.length * 50 + data.comments.length * 25 + data.upvotedPosts.length * 10 + data.upvotedComments.length * 10;
        setLocalVibesEarned(totalVibes);
      }

      setNewPostText('');
      setNewPostImage(null);
      setNewPostImagePreview(null);
      setIsModalOpen(false);
      
      // Reload current user's profile first to ensure it's available for the new post
      if (account && accountHexAddress) {
        // Load profile with both SS58 and hex addresses
        await Promise.all([
          loadProfile(account.address),
          loadProfile(accountHexAddress),
        ]);
      }
      
      // Wait for transaction to be processed on-chain before reloading posts
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadPosts();
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUpvote = async (postId: bigint) => {
    if (!program || !account) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check state BEFORE the transaction to determine if we're adding or removing
      const contractAddress = ENV.PROGRAM_ID;
      const stored = localStorage.getItem(`vibes_earned_${account.address}`);
      const data = parseVibesEarnedData(stored, contractAddress);
      const postIdStr = postId.toString();
      const wasAlreadyUpvoted = data.upvotedPosts.includes(postIdStr);

      const transaction = program.miniReddit.toggleUpvote(postId, null);
      
      await transaction
        .withAccount(account.address, { signer: account.signer })
        .calculateGas()
        .then((tx: { signAndSend: () => Promise<unknown> }) => tx.signAndSend());

      // If it was already upvoted, we just removed it (subtract vibes)
      // If it wasn't upvoted, we just added it (add vibes)
      if (wasAlreadyUpvoted) {
        // Upvote was REMOVED - subtract vibes (no notification)
        const index = data.upvotedPosts.indexOf(postIdStr);
        if (index > -1) {
          data.upvotedPosts.splice(index, 1);
        }
      } else {
        // Upvote was ADDED - add vibes
        const vibesEarned = 10;
        setVibesEarnedNotification(vibesEarned);
        setTimeout(() => setVibesEarnedNotification(null), 5000);
        
        data.upvotedPosts.push(postIdStr);
      }
      
      saveVibesEarnedData(account.address, data, contractAddress);
      
      // Calculate total vibes
      const totalVibes = data.posts.length * 50 + data.comments.length * 25 + data.upvotedPosts.length * 10 + data.upvotedComments.length * 10;
      setLocalVibesEarned(totalVibes);

      setTimeout(() => { void loadPosts(); }, 2000);
    } catch (err) {
      console.error('Failed to toggle upvote:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle upvote');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async (postId: bigint, text: string, imageUri: string | null, parentId: bigint | null) => {
    if (!program || !account) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const transaction = program.miniReddit.createComment(postId, parentId, text, imageUri, null);
      
      await transaction
        .withAccount(account.address, { signer: account.signer })
        .calculateGas()
        .then((tx: { signAndSend: () => Promise<unknown> }) => tx.signAndSend());

      // Show notification for vibes earned (25 for commenting)
      const vibesEarned = 25;
      setVibesEarnedNotification(vibesEarned);
      setTimeout(() => setVibesEarnedNotification(null), 5000);

      // Track comment locally with fixed 25 vibes reward
      if (account) {
        const contractAddress = ENV.PROGRAM_ID;
        const stored = localStorage.getItem(`vibes_earned_${account.address}`);
        const data = parseVibesEarnedData(stored, contractAddress);
        const commentId = `comment_${Date.now()}`;
        data.comments.push(commentId);
        
        saveVibesEarnedData(account.address, data, contractAddress);
        
        // Calculate total vibes
        const totalVibes = data.posts.length * 50 + data.comments.length * 25 + data.upvotedPosts.length * 10 + data.upvotedComments.length * 10;
        setLocalVibesEarned(totalVibes);
        
        // Reload current user's profile to ensure it's available for the newly created comment
        if (accountHexAddress) {
          await Promise.all([
            loadProfile(account.address),
            loadProfile(accountHexAddress),
          ]);
        } else {
          await loadProfile(account.address);
        }
      }
      await loadComments(postId);
      await loadPosts();
    } catch (err) {
      console.error('Failed to create comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to create comment');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCommentUpvote = async (commentId: bigint, postId: bigint) => {
    if (!program || !account) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check state BEFORE the transaction
      const contractAddress = ENV.PROGRAM_ID;
      const stored = localStorage.getItem(`vibes_earned_${account.address}`);
      const data = parseVibesEarnedData(stored, contractAddress);
      const commentIdStr = commentId.toString();
      const wasAlreadyUpvoted = data.upvotedComments.includes(commentIdStr);

      const transaction = program.miniReddit.toggleCommentUpvote(commentId, null);
      
      await transaction
        .withAccount(account.address, { signer: account.signer })
        .calculateGas()
        .then((tx: { signAndSend: () => Promise<unknown> }) => tx.signAndSend());

      // If it was already upvoted, we just removed it (subtract vibes)
      // If it wasn't upvoted, we just added it (add vibes)
      if (wasAlreadyUpvoted) {
        // Comment upvote was REMOVED - subtract vibes (no notification)
        const index = data.upvotedComments.indexOf(commentIdStr);
        if (index > -1) {
          data.upvotedComments.splice(index, 1);
        }
      } else {
        // Comment upvote was ADDED - add vibes
        const vibesEarned = 10;
        setVibesEarnedNotification(vibesEarned);
        setTimeout(() => setVibesEarnedNotification(null), 5000);
        
        data.upvotedComments.push(commentIdStr);
      }
      
      saveVibesEarnedData(account.address, data, contractAddress);
      
      // Calculate total vibes
      const totalVibes = data.posts.length * 50 + data.comments.length * 25 + data.upvotedPosts.length * 10 + data.upvotedComments.length * 10;
      setLocalVibesEarned(totalVibes);

      await loadComments(postId);
    } catch (err) {
      console.error('Failed to toggle comment upvote:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle comment upvote');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (username: string | null, socialHandle: string | null, description: string | null, avatarUri: string | null) => {
    if (!program || !account) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const transaction = program.miniReddit.updateProfile(username, socialHandle, description, avatarUri, null);
      
      await transaction
        .withAccount(account.address, { signer: account.signer })
        .calculateGas()
        .then((tx: { signAndSend: () => Promise<unknown> }) => tx.signAndSend());

      if (account) {
        await loadProfile(account.address);
      }
      await loadProfile(account.address);
      await loadPosts();
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Convert account address to hex format for profile lookup
  const accountHexAddress = useMemo(() => {
    if (!account) return null;
    try {
      const accountBytes = decodeAddress(account.address) as unknown as Uint8Array;
      // Ensure exactly 32 bytes
      let account32Bytes: Uint8Array;
      if (accountBytes.length === 32) {
        account32Bytes = accountBytes;
      } else if (accountBytes.length > 32) {
        account32Bytes = accountBytes.slice(0, 32);
      } else {
        const combined = new Uint8Array(32);
        // Copy accountBytes into the combined array - accountBytes is already Uint8Array
        combined.set(accountBytes, 0);
        // Remaining bytes are already zeros by default
        account32Bytes = combined;
      }
      const hex = `0x${Buffer.from(account32Bytes).toString('hex')}`.toLowerCase();
      return hex;
    } catch (e) {
      console.error('[Profile] Failed to convert account address to hex:', e);
      return account.address.toLowerCase();
    }
  }, [account]);

  // Find current user's profile - simple direct lookup
  const currentProfile = useMemo(() => {
    if (!account) return null;
    
    // Try direct lookup with SS58 address first
    let profile = profiles.get(account.address.toLowerCase());
    if (profile) return profile;
    
    // Try with hex address
    if (accountHexAddress) {
      profile = profiles.get(accountHexAddress);
      if (profile) return profile;
    }
    
    // Try findProfile as fallback
    profile = findProfile(account.address) || undefined;
    if (profile) return profile;
    
    if (accountHexAddress) {
      profile = findProfile(accountHexAddress) || undefined;
      if (profile) return profile;
    }
    
    return undefined;
  }, [account, accountHexAddress, profiles, findProfile]);
  
  // Compute display name and handle for current user (same logic as profile page)
  const currentDisplayName = useMemo(() => {
    if (!account) return null;
    return currentProfile?.username || formatAddress(account.address);
  }, [account, currentProfile]);
  
  const currentHandle = useMemo(() => {
    if (!account) return null;
    return currentProfile?.social_handle 
      ? (currentProfile.social_handle.startsWith('@') ? currentProfile.social_handle : `@${currentProfile.social_handle}`)
      : `@${formatAddress(account.address).replace('0x', '').slice(0, 8)}`;
  }, [account, currentProfile]);

  if (!isApiReady) {
    return (
      <div className="mini-reddit" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="mini-reddit__loading" style={{ background: '#1a1a1a', padding: '3rem', borderRadius: '12px' }}>
          <h2 style={{ color: '#00ffc4', marginBottom: '1rem' }}>🔄 Connecting to Vara Network...</h2>
          <p style={{ color: '#8b8b8b' }}>Please wait while we connect to the blockchain</p>
        </div>
      </div>
    );
  }

  if (!ENV.PROGRAM_ID) {
    return (
      <div className="mini-reddit">
        <div className="error-message">
          <h2>⚠️ Program ID Not Set</h2>
          <p>Please set VITE_PROGRAM_ID in your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mini-reddit">
      {/* Vibes Earned Notification */}
      {vibesEarnedNotification !== null && (
        <div className="mini-reddit__vibes-notification">
          🎉 You earned {vibesEarnedNotification} $VIBES!
        </div>
      )}

      {/* Left Sidebar */}
      <aside className="mini-reddit__sidebar-left">
        <div className="mini-reddit__sidebar-content">
          <div className="mini-reddit__logo">
          </div>
          <nav className="mini-reddit__nav">
            <div className="mini-reddit__nav-item mini-reddit__nav-item--active">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Home</span>
            </div>
            <div className="mini-reddit__nav-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <span>Explore</span>
            </div>
            <div className="mini-reddit__nav-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span>Notifications</span>
            </div>
            <div 
              className="mini-reddit__nav-item" 
              onClick={() => account && navigate('/profile')}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && account) {
                  e.preventDefault();
                  navigate('/profile');
                }
              }}
              role={account ? 'button' : undefined}
              tabIndex={account ? 0 : undefined}
              style={{ cursor: account ? 'pointer' : 'default' }}
              aria-label={account ? 'View profile' : undefined}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Profile</span>
            </div>
            <div className="mini-reddit__nav-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
              <span>Leaderboard</span>
            </div>
            <div className="mini-reddit__nav-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1"/>
                <circle cx="19" cy="12" r="1"/>
                <circle cx="5" cy="12" r="1"/>
              </svg>
              <span>More</span>
            </div>
          </nav>
          {account && (
            <div className="mini-reddit__vibes-display">
              <span className="mini-reddit__vibes-label">$VIBE Points</span>
              <span className="mini-reddit__vibes-value">
                {localVibesEarned}
              </span>
            </div>
          )}
          <button className="mini-reddit__post-btn" onClick={() => setIsModalOpen(true)}>Post</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="mini-reddit__main">
        <div className="mini-reddit__header-tabs">
          <div className="mini-reddit__tab mini-reddit__tab--active">
            <span>For you</span>
          </div>
          <div className="mini-reddit__tab">
            <span>Following</span>
          </div>
        </div>

        {error && (
          <div className="mini-reddit__error">
            {error}
          </div>
        )}

        <section className="mini-reddit__create">
          <div className="mini-reddit__create-avatar">
            {currentProfile?.avatar_uri ? (
              <img src={getIPFSUrl(currentProfile.avatar_uri)} alt={currentProfile.username || 'Avatar'} />
            ) : (
              <div className="mini-reddit__create-avatar-placeholder">
                {currentProfile?.username ? currentProfile.username[0].toUpperCase() : (account ? '👤' : '🔗')}
              </div>
            )}
          </div>
          <div className="mini-reddit__create-content">
            <textarea
              className="mini-reddit__textarea"
              placeholder="What&apos;s happening?"
              value={newPostText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPostText(e.target.value)}
              maxLength={500}
              disabled={loading || !account}
            />
            {newPostImagePreview && (
              <div className="mini-reddit__image-preview">
                <img src={newPostImagePreview} alt="Preview" />
                <button
                  type="button"
                  className="mini-reddit__remove-image"
                  onClick={handleRemoveImage}
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            )}
            <div className="mini-reddit__create-actions">
              <div className="mini-reddit__create-icons">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={loading || !account || uploadingImage}
                  className="mini-reddit__file-input"
                  id="post-image-input"
                />
                <label
                  htmlFor="post-image-input"
                  className="mini-reddit__icon-btn"
                  title="Add image"
                >
                  {uploadingImage ? '⏳' : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  )}
                </label>
              </div>
              <div className="mini-reddit__create-footer">
                <span className="mini-reddit__char-count">
                  {newPostText.length}/500
                </span>
                <Button
                  text={loading ? 'Posting...' : 'Post'}
                  onClick={handleCreatePost}
                  disabled={loading || !account || (!newPostText.trim() && !newPostImage)}
                />
              </div>
            </div>
            {!account && (
              <p className="mini-reddit__connect-hint">
                Connect your wallet to post
              </p>
            )}
          </div>
        </section>

        <div className="mini-reddit__divider"></div>

        {loading && posts.length === 0 ? (
          <div className="mini-reddit__loading">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="mini-reddit__empty">
            <p>No posts yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="mini-reddit__posts-list">
            {posts.map((post) => {
              // Check if this is the current user's post FIRST (before other lookups)
              const normalizedAuthor = post.author.toLowerCase();
              let postProfile: Profile | null = null;
              
              if (account && accountHexAddress) {
                const isCurrentUserPost = normalizedAuthor === accountHexAddress.toLowerCase() ||
                                         normalizedAuthor === account.address.toLowerCase();
                if (isCurrentUserPost && currentProfile) {
                  postProfile = currentProfile;
                }
              }
              
              // If not current user or currentProfile not available, try lookup strategies
              if (!postProfile) {
                postProfile = profiles.get(normalizedAuthor) || null;
              }
              
              if (!postProfile) {
                postProfile = profiles.get(post.author) || null;
              }
              
              if (!postProfile) {
                postProfile = findProfile(post.author);
              }
              
              if (!postProfile) {
                for (const [key, profile] of profiles.entries()) {
                  if (profile.wallet.toLowerCase() === normalizedAuthor || 
                      profile.wallet.toLowerCase() === post.author.toLowerCase()) {
                    postProfile = profile;
                    break;
                  }
                }
              }
              
              // If profile not found or incomplete, trigger load (async, won't block render)
              if ((!postProfile || (!postProfile.username && !postProfile.avatar_uri)) && post.author) {
                void loadProfile(post.author);
              }
              
              const postComments = comments.get(post.id) || [];
              
              // Always prioritize profile data - only show wallet as last resort
              const displayName = postProfile?.username || formatAddress(post.author);
              const handle = postProfile?.social_handle 
                ? (postProfile.social_handle.startsWith('@') ? postProfile.social_handle : `@${postProfile.social_handle}`)
                : `@${formatAddress(post.author).replace('0x', '').slice(0, 8)}`;

              return (
                <article key={post.id.toString()} className="mini-reddit__post">
                  <div className="mini-reddit__post-avatar">
                    {postProfile?.avatar_uri ? (
                      <img src={getIPFSUrl(postProfile.avatar_uri)} alt={displayName} />
                    ) : (
                      <div className="mini-reddit__post-avatar-placeholder">
                        {postProfile?.username ? postProfile.username[0].toUpperCase() : '👤'}
                      </div>
                    )}
                  </div>
                  <div className="mini-reddit__post-content">
                    <div className="mini-reddit__post-header">
                      <div className="mini-reddit__post-author-info">
                        <span className="mini-reddit__post-author">{displayName}</span>
                        <span className="mini-reddit__post-handle">{handle}</span>
                        <span className="mini-reddit__post-dot">·</span>
                        <span className="mini-reddit__post-time">
                          {new Date(Number(post.created_at)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>
                    <div className="mini-reddit__post-text-container">
                      {(() => {
                        const TEXT_LIMIT = 150;
                        const postIdStr = post.id.toString();
                        const isExpanded = expandedPosts.has(postIdStr);
                        const isLongText = post.text.length > TEXT_LIMIT;
                        
                        return (
                          <>
                            <p className="mini-reddit__post-text">
                              {isLongText && !isExpanded 
                                ? `${post.text.slice(0, TEXT_LIMIT)}...` 
                                : post.text}
                            </p>
                            {isLongText && (
                              <button
                                className="mini-reddit__show-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPosts(prev => {
                                    const newSet = new Set(prev);
                                    if (isExpanded) {
                                      newSet.delete(postIdStr);
                                    } else {
                                      newSet.add(postIdStr);
                                    }
                                    return newSet;
                                  });
                                }}
                              >
                                {isExpanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {post.image_uri && (
                      <div className="mini-reddit__post-image">
                        <img src={getIPFSUrl(post.image_uri)} alt="Post attachment" />
                      </div>
                    )}
                    <div className="mini-reddit__post-actions">
                      <button className="mini-reddit__action-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span>{post.comment_count}</span>
                      </button>
                      <button
                        className="mini-reddit__action-btn mini-reddit__action-btn--upvote"
                        onClick={() => { void handleToggleUpvote(post.id); }}
                        disabled={loading || !account}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span>{post.upvotes}</span>
                      </button>
                      <button className="mini-reddit__action-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"/>
                          <circle cx="6" cy="12" r="3"/>
                          <circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                      </button>
                    </div>
                    <CommentSection
                      postId={post.id}
                      comments={postComments}
                      onCreateComment={(text, imageUri, parentId) => handleCreateComment(post.id, text, imageUri, parentId)}
                      onUpvoteComment={(commentId) => handleToggleCommentUpvote(commentId, post.id)}
                      account={account?.address || null}
                      accountHexAddress={accountHexAddress}
                      currentProfile={currentProfile}
                      profiles={profiles}
                      findProfile={findProfile}
                      loadProfile={loadProfile}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Right Sidebar */}
      <aside className="mini-reddit__sidebar-right">
        <div className="mini-reddit__search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Search VibePost" />
        </div>

        <div className="mini-reddit__sidebar-card">
          <h3>About VibePost</h3>
          <p>A decentralized social network built on Vara. Get rewards. All posts live forever.</p>
          {account && (() => {
            const contractAddress = ENV.PROGRAM_ID;
            const stored = localStorage.getItem(`vibes_earned_${account.address}`);
            const data = parseVibesEarnedData(stored, contractAddress);
            const postsCount = data.posts.length;
            const commentsCount = data.comments.length;
            const upvotesCount = data.upvotedPosts.length;
            const commentUpvotesCount = data.upvotedComments.length;
            const totalVibesEarned = postsCount * 50 + commentsCount * 25 + upvotesCount * 10 + commentUpvotesCount * 10;
            
            return (
              <div className="mini-reddit__stats">
                <div className="mini-reddit__stat">
                  <span className="mini-reddit__stat-label">Posts</span>
                  <span className="mini-reddit__stat-value">{postsCount}</span>
                </div>
                <div className="mini-reddit__stat">
                  <span className="mini-reddit__stat-label">Comments</span>
                  <span className="mini-reddit__stat-value">{commentsCount}</span>
                </div>
                <div className="mini-reddit__stat">
                  <span className="mini-reddit__stat-label">UpVote</span>
                  <span className="mini-reddit__stat-value">{upvotesCount}</span>
                </div>
                <div className="mini-reddit__stat">
                  <span className="mini-reddit__stat-label">Comment Upvote</span>
                  <span className="mini-reddit__stat-value">{commentUpvotesCount}</span>
                </div>
                <div className="mini-reddit__stat mini-reddit__stat--total">
                  <span className="mini-reddit__stat-label">$Vibe Earned</span>
                  <span className="mini-reddit__stat-value">{totalVibesEarned}</span>
                </div>
              </div>
            );
          })()}
          {!account && (
            <div className="mini-reddit__stats">
              <div className="mini-reddit__stat">
                <span className="mini-reddit__stat-label">Total Posts</span>
                <span className="mini-reddit__stat-value">{posts.length}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mini-reddit__sidebar-card">
          <h3>What&apos;s happening</h3>
          <div className="mini-reddit__trend-item">
            <div className="mini-reddit__trend-meta">
              <span>Trending · Web3</span>
            </div>
            <div className="mini-reddit__trend-title">#VaraNetwork</div>
            <div className="mini-reddit__trend-count">{posts.length} posts</div>
          </div>
          <div className="mini-reddit__trend-item">
            <div className="mini-reddit__trend-meta">
              <span>Trending · Blockchain</span>
            </div>
            <div className="mini-reddit__trend-title">#OnChainSocial</div>
            <div className="mini-reddit__trend-count">Live</div>
          </div>
          <div className="mini-reddit__trend-item">
            <div className="mini-reddit__trend-meta">
              <span>Trending · Crypto</span>
            </div>
            <div className="mini-reddit__trend-title">#VibePost</div>
            <div className="mini-reddit__trend-count">{posts.reduce((sum, p) => sum + p.upvotes, 0)} vibes</div>
          </div>
        </div>

        <div className="mini-reddit__sidebar-footer">
          <button type="button">Terms of Service</button>
          <button type="button">Privacy Policy</button>
          <button type="button">About</button>
          <span>© 2025 VibePost</span>
        </div>
      </aside>

      {/* Post Modal */}
      {isModalOpen && (
        <div 
          className="mini-reddit__modal-overlay" 
          onClick={() => setIsModalOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsModalOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        >
          <div 
            className="mini-reddit__modal"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mini-reddit__modal-header">
              <button className="mini-reddit__modal-close" onClick={() => setIsModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="mini-reddit__modal-body">
              <div className="mini-reddit__modal-create">
                <div className="mini-reddit__create-avatar">
                  {currentProfile?.avatar_uri ? (
                    <img src={getIPFSUrl(currentProfile.avatar_uri)} alt={currentProfile.username || 'Avatar'} />
                  ) : (
                    <div className="mini-reddit__create-avatar-placeholder">
                      {currentProfile?.username ? currentProfile.username[0].toUpperCase() : (account ? '👤' : '🔗')}
                    </div>
                  )}
                </div>
                <div className="mini-reddit__create-content">
                  <textarea
                    className="mini-reddit__textarea mini-reddit__textarea--modal"
                    placeholder="What&apos;s happening?"
                    value={newPostText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPostText(e.target.value)}
                    maxLength={500}
                    disabled={loading || !account}
                  />
                  {newPostImagePreview && (
                    <div className="mini-reddit__image-preview">
                      <img src={newPostImagePreview} alt="Preview" />
                      <button
                        type="button"
                        className="mini-reddit__remove-image"
                        onClick={handleRemoveImage}
                        disabled={loading}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {!account && (
                    <p className="mini-reddit__connect-hint">
                      Connect your wallet to post
                    </p>
                  )}
                </div>
              </div>
              <div className="mini-reddit__modal-footer">
                <div className="mini-reddit__create-icons">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={loading || !account || uploadingImage}
                    className="mini-reddit__file-input"
                    id="modal-image-input"
                  />
                  <label
                    htmlFor="modal-image-input"
                    className="mini-reddit__icon-btn"
                    title="Add image"
                  >
                    {uploadingImage ? '⏳' : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    )}
                  </label>
                </div>
                <div className="mini-reddit__modal-actions">
                  <span className="mini-reddit__char-count">
                    {newPostText.length}/500
                  </span>
                  <Button
                    text={loading ? 'Posting...' : 'Post'}
                    onClick={async () => {
                      await handleCreatePost();
                    }}
                    disabled={loading || !account || (!newPostText.trim() && !newPostImage)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      <button 
        className="mini-reddit__fab"
        onClick={() => setIsModalOpen(true)}
        aria-label="Create post"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Profile Modal */}
      {account && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdate={handleUpdateProfile}
          currentProfile={currentProfile ? {
            username: currentProfile.username,
            social_handle: currentProfile.social_handle,
            description: currentProfile.description,
            avatar_uri: currentProfile.avatar_uri,
          } : null}
          account={account.address}
          loading={loading}
        />
      )}
    </div>
  );
}
