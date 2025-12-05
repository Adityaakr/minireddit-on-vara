import { useState, useEffect, useMemo } from 'react';
import { useAccount, useApi } from '@gear-js/react-hooks';
import { Button } from '@gear-js/vara-ui';

import { SailsProgram } from '@/app/utils/src/lib';
import { ENV } from '@/consts';

import './mini-reddit.scss';

interface RawPost {
  id: string | number | bigint;
  author: Uint8Array | number[];
  text: string;
  created_at: string | number | bigint;
  upvotes: number;
}

interface Post {
  id: bigint;
  author: string;
  text: string;
  created_at: bigint;
  upvotes: number;
}

export function MiniReddit() {
  const { api, isApiReady } = useApi();
  const { account } = useAccount();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const program = useMemo(() => {
    if (api && ENV.PROGRAM_ID) {
      return new SailsProgram(api, ENV.PROGRAM_ID as `0x${string}`);
    }
    return null;
  }, [api]);

  const loadPosts = async () => {
    if (!program || !api) {
      console.log('Program or API not initialized');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await program.miniReddit.getAllPosts().call();
      console.log('Posts from blockchain:', result);

      const rawPosts = result as unknown as RawPost[];

      const formattedPosts: Post[] = rawPosts.map((p) => ({
        id: BigInt(p.id),
        author: `0x${Buffer.from(p.author).toString('hex')}`,
        text: p.text,
        created_at: BigInt(p.created_at),
        upvotes: Number(p.upvotes),
      }));
      
      setPosts(formattedPosts);
      setError(null);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (program) {
      void loadPosts();
    }
  }, [program]);

  const handleCreatePost = async () => {
    if (!program || !account) {
      setError('Please connect your wallet');
      return;
    }

    if (!newPostText.trim()) {
      setError('Post text cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const transaction = program.miniReddit.createPost(newPostText, null);
      
      await transaction
        .withAccount(account.address, { signer: account.signer })
        .calculateGas()
        .then((tx: { signAndSend: () => Promise<unknown> }) => tx.signAndSend());

      setNewPostText('');
      setTimeout(() => { void loadPosts(); }, 2000);
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

      const transaction = program.miniReddit.toggleUpvote(postId, null);
      
      await transaction
        .withAccount(account.address, { signer: account.signer })
        .calculateGas()
        .then((tx: { signAndSend: () => Promise<unknown> }) => tx.signAndSend());

      setTimeout(() => { void loadPosts(); }, 2000);
    } catch (err) {
      console.error('Failed to toggle upvote:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle upvote');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length < 13) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
            <div className="mini-reddit__nav-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Profile</span>
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
            {account ? '👤' : '🔗'}
          </div>
          <div className="mini-reddit__create-content">
            <textarea
              className="mini-reddit__textarea"
              placeholder="What's happening?"
              value={newPostText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPostText(e.target.value)}
              maxLength={280}
              disabled={loading || !account}
            />
            <div className="mini-reddit__create-actions">
              <div className="mini-reddit__create-icons">
                <button className="mini-reddit__icon-btn" title="Media">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </button>
                <button className="mini-reddit__icon-btn" title="GIF">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                    <polyline points="17 2 12 7 7 2"/>
                  </svg>
                </button>
                <button className="mini-reddit__icon-btn" title="Emoji">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
              </div>
              <div className="mini-reddit__create-footer">
                {newPostText.length > 0 && (
                  <span className="mini-reddit__char-count">
                    {newPostText.length}/280
                  </span>
                )}
                <Button
                  text={loading ? 'Posting...' : 'Post'}
                  onClick={handleCreatePost}
                  disabled={loading || !account || !newPostText.trim()}
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
            {posts.map((post) => (
              <article key={post.id.toString()} className="mini-reddit__post">
                <div className="mini-reddit__post-avatar">
                  👤
                </div>
                <div className="mini-reddit__post-content">
                  <div className="mini-reddit__post-header">
                    <div className="mini-reddit__post-author-info">
                      <span className="mini-reddit__post-author">
                        {formatAddress(post.author)}
                      </span>
                      <span className="mini-reddit__post-handle">
                        @{formatAddress(post.author).replace('0x', '').slice(0, 8)}
                      </span>
                      <span className="mini-reddit__post-dot">·</span>
                      <span className="mini-reddit__post-time">
                        {new Date(Number(post.created_at)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>
                  <p className="mini-reddit__post-text">{post.text}</p>
                  <div className="mini-reddit__post-actions">
                    <button className="mini-reddit__action-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                      </svg>
                      <span>0</span>
                    </button>
                    <button className="mini-reddit__action-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="17 1 21 5 17 9"/>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                      </svg>
                      <span>0</span>
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
                </div>
              </article>
            ))}
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
          <p>A decentralized social network built on Vara. Get rewards All posts live forever.</p>
          <div className="mini-reddit__stats">
            <div className="mini-reddit__stat">
              <span className="mini-reddit__stat-label">Total Posts</span>
              <span className="mini-reddit__stat-value">{posts.length}</span>
            </div>
            <div className="mini-reddit__stat">
              <span className="mini-reddit__stat-label">Total Vibes</span>
              <span className="mini-reddit__stat-value">{posts.reduce((sum, p) => sum + p.upvotes, 0)}</span>
            </div>
          </div>
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
                  {account ? '👤' : '🔗'}
                </div>
                <div className="mini-reddit__create-content">
                  <textarea
                    className="mini-reddit__textarea mini-reddit__textarea--modal"
                    placeholder="What's happening?"
                    value={newPostText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPostText(e.target.value)}
                    maxLength={280}
                    disabled={loading || !account}
                  />
                  {!account && (
                    <p className="mini-reddit__connect-hint">
                      Connect your wallet to post
                    </p>
                  )}
                </div>
              </div>
              <div className="mini-reddit__modal-footer">
                <div className="mini-reddit__create-icons">
                  <button className="mini-reddit__icon-btn" title="Media">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                  <button className="mini-reddit__icon-btn" title="GIF">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                      <polyline points="17 2 12 7 7 2"/>
                    </svg>
                  </button>
                  <button className="mini-reddit__icon-btn" title="Emoji">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  </button>
                </div>
                <div className="mini-reddit__modal-actions">
                  {newPostText.length > 0 && (
                    <span className="mini-reddit__char-count">
                      {newPostText.length}/280
                    </span>
                  )}
                  <Button
                    text={loading ? 'Posting...' : 'Post'}
                    onClick={async () => {
                      await handleCreatePost();
                      setIsModalOpen(false);
                    }}
                    disabled={loading || !account || !newPostText.trim()}
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
    </div>
  );
}
