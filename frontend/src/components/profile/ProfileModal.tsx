import { useState, useEffect } from 'react';
import { Button } from '@gear-js/vara-ui';
import { uploadToIPFS, compressImage, getIPFSUrl } from '@/utils';
import './ProfileModal.scss';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (username: string | null, socialHandle: string | null, description: string | null, avatarUri: string | null) => Promise<void>;
  currentProfile?: {
    username?: string | null;
    social_handle?: string | null;
    description?: string | null;
    avatar_uri?: string | null;
  } | null;
  account: string;
  loading?: boolean;
}

export function ProfileModal({ isOpen, onClose, onUpdate, currentProfile, account, loading: externalLoading }: ProfileModalProps) {
  const [username, setUsername] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentProfile) {
      setUsername(currentProfile.username || '');
      setSocialHandle(currentProfile.social_handle || '');
      setDescription(currentProfile.description || '');
      const profileAvatarUri = currentProfile.avatar_uri || null;
      setAvatarUri(profileAvatarUri);
      setAvatarPreview(profileAvatarUri ? getIPFSUrl(profileAvatarUri) : null);
    } else if (isOpen) {
      // Reset form for new profile
      setUsername('');
      setSocialHandle('');
      setDescription('');
      setAvatarUri(null);
      setAvatarPreview(null);
    }
  }, [isOpen, currentProfile]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      const compressed = await compressImage(file, 400, 400, 0.9);
      const uri = await uploadToIPFS(compressed);
      setAvatarUri(uri);
      // Show local preview immediately, then IPFS URL after a short delay
      const localPreview = URL.createObjectURL(file);
      setAvatarPreview(localPreview);
      
      // After a short delay, try to show IPFS URL (in case local preview fails)
      setTimeout(() => {
        const ipfsUrl = getIPFSUrl(uri);
        const img = new Image();
        img.onload = () => {
          setAvatarPreview(ipfsUrl);
          URL.revokeObjectURL(localPreview); // Clean up local URL
        };
        img.onerror = () => {
          // Keep local preview if IPFS isn't ready yet
          // IPFS image not ready yet, keeping local preview
        };
        img.src = ipfsUrl;
      }, 1000);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUri(null);
    setAvatarPreview(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await onUpdate(
        username.trim() || null,
        socialHandle.trim() || null,
        description.trim() || null,
        avatarUri
      );
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="profile-modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={0}
      aria-label="Close modal"
    >
      <div 
        className="profile-modal"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="profile-modal__header">
          <h2>Edit Profile</h2>
          <button className="profile-modal__close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="profile-modal__body">
          <div className="profile-modal__avatar-section">
            <div className="profile-modal__avatar-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" />
              ) : (
                <div className="profile-modal__avatar-placeholder">
                  {username ? username[0].toUpperCase() : '👤'}
                </div>
              )}
            </div>
            <div className="profile-modal__avatar-actions">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                disabled={uploadingAvatar || loading || externalLoading}
                className="profile-modal__file-input"
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload" className="profile-modal__avatar-btn">
                {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
              </label>
              {avatarPreview && (
                <button
                  type="button"
                  className="profile-modal__remove-avatar"
                  onClick={handleRemoveAvatar}
                  disabled={loading || externalLoading}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="profile-modal__form">
            <div className="profile-modal__field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
                disabled={loading || externalLoading}
              />
              <p className="profile-modal__hint">This will be your display name on Lumio Social</p>
            </div>

            <div className="profile-modal__field">
              <label htmlFor="socialHandle">Social Handle</label>
              <input
                id="socialHandle"
                type="text"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="@yourhandle"
                maxLength={30}
                disabled={loading || externalLoading}
              />
              <p className="profile-modal__hint">Your unique handle (letters, numbers, and underscores only)</p>
            </div>

            <div className="profile-modal__field">
              <label htmlFor="description">Bio</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={160}
                rows={4}
                disabled={loading || externalLoading}
              />
              <p className="profile-modal__hint">{description.length}/160 characters</p>
            </div>

            <div className="profile-modal__wallet">
              <div className="profile-modal__wallet-label">Wallet Address</div>
              <div className="profile-modal__wallet-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-modal__footer">
          <Button
            text="Cancel"
            onClick={onClose}
            disabled={loading || externalLoading}
            color="grey"
          />
          <Button
            text={loading || externalLoading ? 'Saving...' : 'Save Profile'}
            onClick={handleSubmit}
            disabled={loading || externalLoading}
          />
        </div>
      </div>
    </div>
  );
}

