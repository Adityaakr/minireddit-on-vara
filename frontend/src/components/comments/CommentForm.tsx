import { useState, useRef } from 'react';
import { Button } from '@gear-js/vara-ui';
import { uploadToIPFS, compressImage } from '@/utils/ipfs';
import './CommentForm.scss';

interface CommentFormProps {
  onSubmit: (text: string, imageUri: string | null) => Promise<void>;
  placeholder?: string;
  replyTo?: string;
  onCancel?: () => void;
  disabled?: boolean;
}

export function CommentForm({ onSubmit, placeholder = 'Write a comment...', replyTo, onCancel, disabled }: CommentFormProps) {
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      
      const compressed = await compressImage(file);
      
      const uri = await uploadToIPFS(compressed);
      
      setImageUri(uri);
      setImagePreview(URL.createObjectURL(file));
    } catch (error) {
      console.error('Failed to upload image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image. Please try again.';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !imageUri) {
      alert('Please enter text or add an image');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(text, imageUri);
      setText('');
      setImageUri(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comment-form">
      <textarea
        className="comment-form__textarea"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        disabled={disabled || submitting}
      />
      {imagePreview && (
        <div className="comment-form__image-preview">
          <img src={imagePreview} alt="Preview" />
          <button
            type="button"
            className="comment-form__remove-image"
            onClick={handleRemoveImage}
            disabled={submitting}
          >
            ×
          </button>
        </div>
      )}
      <div className="comment-form__actions">
        <div className="comment-form__left">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            disabled={disabled || submitting || uploading}
            className="comment-form__file-input"
            id={`comment-file-${replyTo || 'new'}`}
          />
          <label
            htmlFor={`comment-file-${replyTo || 'new'}`}
            className="comment-form__file-label"
            title="Add image"
          >
            {uploading ? (
              '⏳'
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
          </label>
        </div>
        <div className="comment-form__right">
          <span className="comment-form__char-count">
            {text.length}/500
          </span>
          {onCancel && (
            <Button
              text="Cancel"
              onClick={onCancel}
              disabled={submitting}
              color="grey"
            />
          )}
          <Button
            text={submitting ? 'Posting...' : 'Post'}
            onClick={handleSubmit}
            disabled={disabled || submitting || (!text.trim() && !imageUri)}
          />
        </div>
      </div>
    </div>
  );
}

