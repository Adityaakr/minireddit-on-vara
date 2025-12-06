import { useState, useEffect, useMemo } from 'react';
import { useAccount, useApi } from '@gear-js/react-hooks';
import { useNavigate } from 'react-router-dom';
import { decodeAddress } from '@gear-js/api';
import { Button } from '@gear-js/vara-ui';

import { SailsProgram } from '@/app/utils/src/lib';
import { ENV } from '@/consts';
import { ProfileModal } from '@/components/profile';
import { formatAddress, getIPFSUrl } from '@/utils';
import './Profile.scss';

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

interface Post {
  id: bigint;
  author: string;
  text: string;
  image_uri: string | null;
  created_at: bigint;
  upvotes: number;
  comment_count: number;
}

export function Profile() {
  const { api, isApiReady } = useApi();
  const { account } = useAccount();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [vibesBalance, setVibesBalance] = useState<number>(0);
  const [localVibesEarned, setLocalVibesEarned] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  const program = useMemo(() => {
    if (api && ENV.PROGRAM_ID) {
      return new SailsProgram(api, ENV.PROGRAM_ID as `0x${string}`);
    }
    return null;
  }, [api]);

  const loadProfile = async () => {
    if (!program || !account) return;

    try {
      setLoading(true);
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
        setProfile(profileData);
      } else {
        // No profile yet
        setProfile({
          wallet: account.address.toLowerCase(),
          username: null,
          social_handle: null,
          description: null,
          avatar_uri: null,
          created_at: BigInt(0),
          total_posts: 0,
          total_vibes_earned: BigInt(0),
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    if (!program || !account) return;

    try {
      setLoading(true);
      const result = await program.miniReddit.getAllPosts().call();
      const rawPosts = result as unknown as Array<{
        id: string | number | bigint;
        author: Uint8Array | number[];
        text: string;
        image_uri?: string | null;
        created_at: string | number | bigint;
        upvotes: number;
        comment_count?: number;
      }>;

      const userAddress = account.address.toLowerCase();
      const filtered = rawPosts
        .filter((p) => {
          const author = `0x${Buffer.from(p.author).toString('hex')}`.toLowerCase();
          return author === userAddress;
        })
        .map((p) => ({
          id: BigInt(p.id),
          author: `0x${Buffer.from(p.author).toString('hex')}`.toLowerCase(),
          text: p.text,
          image_uri: p.image_uri || null,
          created_at: BigInt(p.created_at),
          upvotes: Number(p.upvotes),
          comment_count: Number(p.comment_count || 0),
        }))
        .sort((a, b) => {
          // Sort by created_at descending (newest first)
          return Number(b.created_at) - Number(a.created_at);
        });

      setUserPosts(filtered);
    } catch (err) {
      console.error('Failed to load user posts:', err);
    } finally {
      setLoading(false);
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

  const handleUpdateProfile = async (
    username: string | null,
    socialHandle: string | null,
    description: string | null,
    avatarUri: string | null
  ) => {
    if (!program || !account) return;

    try {
      setLoading(true);
      const transaction = program.miniReddit.updateProfile(username, socialHandle, description, avatarUri, null);
      
      await transaction
        .withAccount(account.address, { signer: account.signer })
        .calculateGas()
        .then((tx: { signAndSend: () => Promise<unknown> }) => tx.signAndSend());

      // Reload profile after update
      setTimeout(() => {
        void loadProfile();
        void loadVibesBalance();
      }, 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load local vibes earned from localStorage
  useEffect(() => {
    if (account) {
      const contractAddress = ENV.PROGRAM_ID;
      const stored = localStorage.getItem(`vibes_earned_${account.address}`);
      const data = parseVibesEarnedData(stored, contractAddress);
      const totalVibes = data.posts.length * 50 + data.comments.length * 25 + data.upvotedPosts.length * 10 + data.upvotedComments.length * 10;
      setLocalVibesEarned(totalVibes);
    } else {
      setLocalVibesEarned(0);
    }
  }, [account]);

  useEffect(() => {
    if (program && account) {
      void loadProfile();
      void loadUserPosts();
      void loadVibesBalance();
    }
  }, [program, account]);

  if (!isApiReady) {
    return (
      <div className="profile-page">
        <div className="profile-page__loading">Loading...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="profile-page">
        <div className="profile-page__error">
          <p>Please connect your wallet to view your profile</p>
          <Button text="Go Home" onClick={() => navigate('/')} />
        </div>
      </div>
    );
  }

  const displayName = profile?.username || formatAddress(account.address);
  const handle = profile?.social_handle 
    ? (profile.social_handle.startsWith('@') ? profile.social_handle : `@${profile.social_handle}`)
    : `@${formatAddress(account.address).replace('0x', '').slice(0, 8)}`;

  return (
    <div className="profile-page">
      {/* Header with back button */}
      <div className="profile-page__top-header">
        <button 
          className="profile-page__back-btn"
          onClick={() => navigate('/')}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 className="profile-page__top-title">Profile</h2>
      </div>

      {/* Profile Header */}
      <div className="profile-page__header">
        <div className="profile-page__avatar-section">
          <div className="profile-page__avatar">
            {profile?.avatar_uri ? (
              <img src={getIPFSUrl(profile.avatar_uri)} alt={displayName} />
            ) : (
              <div className="profile-page__avatar-placeholder">
                {profile?.username ? profile.username[0].toUpperCase() : '👤'}
              </div>
            )}
          </div>
        </div>
        <div className="profile-page__actions">
          <Button
            text="Edit profile"
            onClick={() => setIsProfileModalOpen(true)}
            color="grey"
          />
        </div>
      </div>

      {/* Profile Info */}
      <div className="profile-page__info">
        <div className="profile-page__name-section">
          <h1 className="profile-page__name">{displayName}</h1>
          <p className="profile-page__handle">{handle}</p>
        </div>

        {profile?.description && (
          <div className="profile-page__bio">
            <p>{profile.description}</p>
          </div>
        )}

        {/* Stats Cards Section */}
        <div className="profile-page__stats-grid">
          <div className="profile-page__stat-card profile-page__stat-card--vibes">
            <div className="profile-page__stat-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="profile-page__stat-card-content">
              <span className="profile-page__stat-card-value">{localVibesEarned.toLocaleString()}</span>
              <span className="profile-page__stat-card-label">$VIBE Earned</span>
            </div>
          </div>

          <div className="profile-page__stat-card profile-page__stat-card--breakdown">
            <div className="profile-page__stat-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
            </div>
            <div className="profile-page__stat-card-content">
              {(() => {
                const contractAddress = ENV.PROGRAM_ID;
                const stored = localStorage.getItem(`vibes_earned_${account.address}`);
                const data = parseVibesEarnedData(stored, contractAddress);
                const postsCount = data.posts.length;
                const commentsCount = data.comments.length;
                const upvotesCount = data.upvotedPosts.length;
                const commentUpvotesCount = data.upvotedComments.length;
                const total = postsCount + commentsCount + upvotesCount + commentUpvotesCount;
                
                return (
                  <>
                    <span className="profile-page__stat-card-value">{total.toLocaleString()}</span>
                    <span className="profile-page__stat-card-label">Total Actions</span>
                    <div className="profile-page__stat-card-details">
                      <div className="profile-page__stat-card-detail">
                        <span className="profile-page__stat-card-detail-label">Posts</span>
                        <span className="profile-page__stat-card-detail-value">{postsCount}</span>
                      </div>
                      <div className="profile-page__stat-card-detail">
                        <span className="profile-page__stat-card-detail-label">Comments</span>
                        <span className="profile-page__stat-card-detail-value">{commentsCount}</span>
                      </div>
                      <div className="profile-page__stat-card-detail">
                        <span className="profile-page__stat-card-detail-label">UpVote</span>
                        <span className="profile-page__stat-card-detail-value">{upvotesCount}</span>
                      </div>
                      <div className="profile-page__stat-card-detail">
                        <span className="profile-page__stat-card-detail-label">Boost</span>
                        <span className="profile-page__stat-card-detail-value">{commentUpvotesCount}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {profile?.created_at && Number(profile.created_at) > 0 && (
          <div className="profile-page__joined">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Joined {new Date(Number(profile.created_at)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        )}
      </div>


      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={handleUpdateProfile}
        currentProfile={profile ? {
          username: profile.username,
          social_handle: profile.social_handle,
          description: profile.description,
          avatar_uri: profile.avatar_uri,
        } : null}
        account={account.address}
        loading={loading}
      />
    </div>
  );
}

