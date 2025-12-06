export { uploadToIPFS, getIPFSUrl, compressImage } from './ipfs';
export { createSessionSignature, hexToUint8Array } from './session';

export function formatAddress(address: string): string {
  if (address.length < 13) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
