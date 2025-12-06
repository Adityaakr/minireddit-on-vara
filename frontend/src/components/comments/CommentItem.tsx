import { useState } from 'react';
import { CommentForm } from './CommentForm';
import { formatAddress, getIPFSUrl } from '@/utils';
import './CommentItem.scss';

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

interface CommentItemProps {
  comment: Comment;
  onReply: (text: string, imageUri: string | null) => Promise<void>;
  onUpvote: () => Promise<void>;
  level?: number;
  account?: string | null;
  profile?: {
    username?: string | null;
    social_handle?: string | null;
    avatar_uri?: string | null;
  } | null;
}

export function CommentItem({ comment, onReply, onUpvote, level = 0, account, profile }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUpvote = async () => {
    try {
      setIsUpvoting(true);
      await onUpvote();
    } catch (error) {
      console.error('Failed to upvote:', error);
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleReply = async (text: string, imageUri: string | null) => {
    await onReply(text, imageUri);
    setShowReplyForm(false);
  };

  const displayName = profile?.username || formatAddress(comment.author);
  const handle = profile?.social_handle 
    ? (profile.social_handle.startsWith('@') ? profile.social_handle : `@${profile.social_handle}`)
    : `@${formatAddress(comment.author).replace('0x', '').slice(0, 8)}`;

  return (
    <div className={`comment-item ${level > 0 ? 'comment-item--nested' : ''}`} style={{ marginLeft: `${level * 24}px` }}>
      <div className="comment-item__content">
        <div className="comment-item__header">
          <div className="comment-item__avatar">
            {profile?.avatar_uri ? (
              <img src={getIPFSUrl(profile.avatar_uri)} alt={displayName} onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.parentElement?.querySelector('.comment-item__avatar-placeholder');
                if (placeholder) {
                  (placeholder as HTMLElement).style.display = 'flex';
                }
              }} />
            ) : null}
            <div className="comment-item__avatar-placeholder" style={{ display: profile?.avatar_uri ? 'none' : 'flex' }}>
              {profile?.username ? (
                profile.username[0].toUpperCase()
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </div>
          </div>
          <div className="comment-item__meta">
            <span className="comment-item__author">{displayName}</span>
            <span className="comment-item__handle">{handle}</span>
            <span className="comment-item__dot">·</span>
            <span className="comment-item__time">
              {new Date(Number(comment.created_at)).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="comment-item__body">
          <div className="comment-item__text-container">
            {(() => {
              const TEXT_LIMIT = 150;
              const isLongText = comment.text.length > TEXT_LIMIT;
              
              return (
                <>
                  <p className="comment-item__text">
                    {isLongText && !isExpanded 
                      ? `${comment.text.slice(0, TEXT_LIMIT)}...` 
                      : comment.text}
                  </p>
                  {isLongText && (
                    <button
                      className="comment-item__show-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                      }}
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
          {comment.image_uri && (
            <div className="comment-item__image">
              <img src={getIPFSUrl(comment.image_uri)} alt="Comment attachment" />
            </div>
          )}
        </div>
        <div className="comment-item__actions">
          <button
            className="comment-item__action comment-item__action--upvote"
            onClick={handleUpvote}
            disabled={!account || isUpvoting}
            title="Upvote"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{comment.upvotes}</span>
          </button>
          <button
            className="comment-item__action"
            onClick={() => setShowReplyForm(!showReplyForm)}
            disabled={!account}
            title="Reply"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Reply</span>
          </button>
        </div>
        {showReplyForm && (
          <div className="comment-item__reply-form">
            <CommentForm
              onSubmit={handleReply}
              placeholder="Write a reply..."
              onCancel={() => setShowReplyForm(false)}
              disabled={!account}
            />
          </div>
        )}
      </div>
    </div>
  );
}

