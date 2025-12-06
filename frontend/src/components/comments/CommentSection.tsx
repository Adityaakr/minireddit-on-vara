import { useState, useEffect, useMemo } from 'react';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import './CommentSection.scss';

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
  avatar_uri?: string | null;
  description?: string | null;
  created_at: bigint;
  total_posts: number;
  total_vibes_earned: bigint;
}

interface CommentSectionProps {
  postId: bigint;
  comments: Comment[];
  onCreateComment: (text: string, imageUri: string | null, parentId: bigint | null) => Promise<void>;
  onUpvoteComment: (commentId: bigint) => Promise<void>;
  account?: string | null;
  accountHexAddress?: string | null;
  currentProfile?: Profile | null;
  profiles?: Map<string, Profile>;
  findProfile?: (wallet: string) => Profile | null;
  loadProfile?: (wallet: string) => Promise<void>;
}

// Build nested comment tree
function buildCommentTree(comments: Comment[]): Array<Comment & { level: number }> {
  const commentMap = new Map<bigint, Comment & { children: Comment[] }>();
  const rootComments: (Comment & { children: Comment[] })[] = [];

  // Create map with children arrays
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // Build tree structure
  comments.forEach(comment => {
    const node = commentMap.get(comment.id)!;
    if (comment.parent_id === null) {
      rootComments.push(node);
    } else {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  // Flatten tree for rendering (DFS)
  function flattenTree(nodes: (Comment & { children: Comment[] })[], level = 0): Array<Comment & { level: number }> {
    const result: Array<Comment & { level: number }> = [];
    nodes.forEach(node => {
      const { children, ...comment } = node;
      result.push({ ...comment, level });
      if (children.length > 0) {
        result.push(...flattenTree(children as (Comment & { children: Comment[] })[], level + 1));
      }
    });
    return result;
  }

  return flattenTree(rootComments);
}

export function CommentSection({ postId, comments, onCreateComment, onUpvoteComment, account, accountHexAddress, currentProfile, profiles, findProfile, loadProfile }: CommentSectionProps) {
  const [showComments, setShowComments] = useState(true);

  const handleCreateComment = async (text: string, imageUri: string | null) => {
    await onCreateComment(text, imageUri, null);
  };

  const handleReply = (commentId: bigint) => {
    return async (text: string, imageUri: string | null) => {
      await onCreateComment(text, imageUri, commentId);
    };
  };

  // Extract all unique comment authors
  const commentAuthors = useMemo(() => {
    const authors = new Set<string>();
    comments.forEach(comment => {
      if (comment.author && comment.author.length >= 64) {
        authors.add(comment.author.toLowerCase());
      }
    });
    return Array.from(authors);
  }, [comments]);

  // Load profiles for comment authors when comments change
  useEffect(() => {
    if (loadProfile && commentAuthors.length > 0 && profiles) {
      // Load profiles for any authors we don't have yet
      commentAuthors.forEach(author => {
        // Check if we already have this profile loaded
        const existingProfile = profiles.get(author) || 
                               Array.from(profiles.values()).find(p => 
                                 p.wallet && p.wallet.toLowerCase() === author
                               );
        
        // Only load if we don't have the profile at all
        if (!existingProfile) {
          void loadProfile(author);
        }
      });
    }
  }, [commentAuthors, profiles, loadProfile]);

  const nestedComments = buildCommentTree(comments);

  return (
    <div className="comment-section">
      <div className="comment-section__header">
        <button
          className="comment-section__toggle"
          onClick={() => setShowComments(!showComments)}
        >
          <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: showComments ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      {showComments && (
        <>
          {account && (
            <div className="comment-section__form">
              <CommentForm
                onSubmit={handleCreateComment}
                placeholder="Write a comment..."
                disabled={!account}
              />
            </div>
          )}
          <div className="comment-section__list">
            {nestedComments.length === 0 ? (
              <div className="comment-section__empty">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              nestedComments.map((comment) => {
                const commentWithLevel = comment as Comment & { level: number };
                
                // Find profile for comment author - use same logic as posts
                // Check if this is the current user's comment FIRST (before other lookups)
                const normalizedAuthor = comment.author.toLowerCase();
                let commentProfile: Profile | null = null;
                
                if (account && accountHexAddress && currentProfile) {
                  const isCurrentUserComment = normalizedAuthor === accountHexAddress.toLowerCase() ||
                                             normalizedAuthor === account.toLowerCase();
                  if (isCurrentUserComment) {
                    commentProfile = currentProfile;
                  }
                }
                
                // If not current user or currentProfile not available, try lookup strategies
                if (!commentProfile && profiles) {
                  commentProfile = profiles.get(normalizedAuthor) || null;
                }
                
                if (!commentProfile && profiles) {
                  commentProfile = profiles.get(comment.author) || null;
                }
                
                if (!commentProfile && findProfile) {
                  commentProfile = findProfile(comment.author);
                }
                
                if (!commentProfile && profiles) {
                  for (const [key, profile] of profiles.entries()) {
                    if (profile.wallet && profile.wallet.toLowerCase() === normalizedAuthor) {
                      commentProfile = profile;
                      break;
                    }
                  }
                }
                
                // Strategy 5: Try prefix matching (first 20 chars) - for partial matches
                if (!commentProfile && profiles && normalizedAuthor.length >= 20) {
                  const prefix = normalizedAuthor.slice(0, 20);
                  for (const [key, profile] of profiles.entries()) {
                    const keyLower = key.toLowerCase();
                    const walletLower = profile.wallet?.toLowerCase() || '';
                    if (keyLower.startsWith(prefix) || walletLower.startsWith(prefix)) {
                      commentProfile = profile;
                      break;
                    }
                  }
                }
                
                // If profile not found or incomplete, trigger load (async, won't block render)
                if ((!commentProfile || (!commentProfile.username && !commentProfile.avatar_uri)) && comment.author && loadProfile) {
                  void loadProfile(comment.author);
                }
                
                // Extract only the fields needed for CommentItem
                const profileForComment = commentProfile ? {
                  username: commentProfile.username,
                  social_handle: commentProfile.social_handle,
                  avatar_uri: commentProfile.avatar_uri,
                } : null;
                
                return (
                  <CommentItem
                    key={comment.id.toString()}
                    comment={comment}
                    onReply={handleReply(comment.id)}
                    onUpvote={async () => await onUpvoteComment(comment.id)}
                    level={commentWithLevel.level}
                    account={account}
                    profile={profileForComment}
                  />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

