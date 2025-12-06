// SignatureData is available globally from global.d.ts
import type { GearApi } from '@gear-js/api';
import type { TypeRegistry } from '@polkadot/types';

/**
 * Create a signature for session creation
 * 
 * NOTE: This function is kept for backward compatibility but is not actively used
 * since the signless session feature has been disabled.
 * 
 * Wallet extensions typically can't sign arbitrary data, only transactions.
 * The session-service accepts null signature and uses the transaction signature as authorization.
 * 
 * @returns null - the transaction signature will serve as authorization
 */
export function createSessionSignature(
  _signatureData: SignatureData,
  _api: GearApi,
  _accountAddress: string,
  _programRegistry: TypeRegistry
): Uint8Array | null {
  // Return null - this is the correct and standard approach
  // Option<Vec<u8>> SCALE encoding:
  // - None (null) encodes as 0x00 (1 byte)
  // - Some(Vec<u8>) encodes as 0x01 + compact Vec length + Vec<u8> bytes
  //
  // The session-service accepts null and uses the transaction signature as authorization.
  return null;
}

/**
 * Helper to convert hex string to Uint8Array if needed
 */
export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

