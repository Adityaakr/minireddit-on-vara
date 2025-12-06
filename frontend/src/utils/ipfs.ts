// IPFS integration using Pinata
const PINATA_API_KEY = (import.meta.env.VITE_PINATA_API_KEY as string) || '';
const PINATA_SECRET_KEY = (import.meta.env.VITE_PINATA_SECRET_KEY as string) || '';
const PINATA_JWT = (import.meta.env.VITE_PINATA_JWT as string) || '';

const PINATA_GATEWAY = (import.meta.env.VITE_PINATA_GATEWAY as string) || 'https://gateway.pinata.cloud/ipfs/';

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload a file to IPFS via Pinata
 */
export async function uploadToIPFS(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    console.log('Uploading to Pinata...', { fileName: file.name, fileSize: file.size, fileType: file.type });

    // Try JWT first (preferred method)
    let response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    // If JWT fails with 401, try API Key + Secret as fallback
    if (response.status === 401) {
      console.log('JWT authentication failed, trying API Key + Secret...');
      // Create new FormData for retry
      const retryFormData = new FormData();
      retryFormData.append('file', file);
      const retryMetadata = JSON.stringify({ name: file.name });
      retryFormData.append('pinataMetadata', retryMetadata);
      const retryOptions = JSON.stringify({ cidVersion: 0 });
      retryFormData.append('pinataOptions', retryOptions);

      response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: retryFormData,
      });
    }

    console.log('Pinata response status:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = (await response.json()) as { error?: { message?: string } | string; message?: string };
        console.error('Pinata error response:', errorData);
        const errorObj = typeof errorData.error === 'object' ? errorData.error : { message: typeof errorData.error === 'string' ? errorData.error : undefined };
        errorMessage = errorObj?.message || errorData.message || JSON.stringify(errorData);
        
        // Handle specific error cases
        if (response.status === 401) {
          errorMessage = 'Pinata authentication failed. Please check your API credentials.';
        } else if (response.status === 403) {
          errorMessage = 'Pinata access denied. Check API permissions.';
        } else if (response.status === 429) {
          errorMessage = 'Pinata rate limit exceeded. Please try again later.';
        } else if (response.status >= 500) {
          errorMessage = 'Pinata server error. Please try again later.';
        }
      } catch {
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Keep default error message
        }
      }
      console.error('Pinata upload failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as PinataResponse;
    console.log('Pinata upload success:', data.IpfsHash);
    
    // Return the IPFS hash, not the full gateway URL (we'll handle gateway in getIPFSUrl)
    return `ipfs://${data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
    throw new Error('Failed to upload image. Please check your connection and try again.');
  }
}

/**
 * Get IPFS URL from hash
 */
export function getIPFSUrl(hash: string): string {
  // If already a full URL, return as is
  if (hash.startsWith('http')) {
    return hash;
  }
  // If it's just a hash, prepend gateway
  if (hash.startsWith('Qm') || hash.startsWith('baf')) {
    return `${PINATA_GATEWAY}${hash}`;
  }
  // If it's ipfs:// format, convert
  if (hash.startsWith('ipfs://')) {
    return hash.replace('ipfs://', PINATA_GATEWAY);
  }
  return hash;
}

/**
 * Compress image before upload (optional, for better UX)
 */
export function compressImage(file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

