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

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleString();
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
      <header className="mini-reddit__header">
        <h1>MiniReddit</h1>
        <p>Decentralized forum powered by Vara Network</p>
      </header>

      {error && (
        <div className="mini-reddit__error">
          {error}
        </div>
      )}

      <section className="mini-reddit__create">
        <h2>Create a Post</h2>
        <textarea
          className="mini-reddit__textarea"
          placeholder="What's on your mind? (max 280 characters)"
          value={newPostText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewPostText(e.target.value)}
          maxLength={280}
          disabled={loading || !account}
        />
        <div className="mini-reddit__create-footer">
          <span className="mini-reddit__char-count">
            {newPostText.length}/280
          </span>
          <Button
            text={loading ? 'Posting...' : 'Post'}
            onClick={handleCreatePost}
            disabled={loading || !account || !newPostText.trim()}
          />
        </div>
        {!account && (
          <p className="mini-reddit__connect-hint">
            👆 Connect your wallet to create posts
          </p>
        )}
      </section>

      <section className="mini-reddit__posts">
        <div className="mini-reddit__posts-header">
          <h2>Recent Posts</h2>
          <Button
            text="🔄 Refresh"
            onClick={() => {
              void loadPosts();
            }}
            disabled={loading}
          />
        </div>

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
                <div className="mini-reddit__post-header">
                  <span className="mini-reddit__post-author">
                    👤 {formatAddress(post.author)}
                  </span>
                  <span className="mini-reddit__post-time">
                    🕐 {formatTimestamp(post.created_at)}
                  </span>
                </div>
                <p className="mini-reddit__post-text">{post.text}</p>
                <div className="mini-reddit__post-footer">
                  <button
                    className="mini-reddit__upvote-btn"
                    onClick={() => {
                      void handleToggleUpvote(post.id);
                    }}
                    disabled={loading || !account}
                  >
                    👍 {post.upvotes}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
