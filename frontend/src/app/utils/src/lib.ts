/* eslint-disable */

import { GearApi, BaseGearProgram, HexString } from '@gear-js/api';
import { TypeRegistry } from '@polkadot/types';
import { TransactionBuilder, ActorId, QueryBuilder, getServiceNamePrefix, getFnNamePrefix, ZERO_ADDRESS } from 'sails-js';

export class SailsProgram {
  public readonly registry: TypeRegistry;
  public readonly miniReddit: MiniReddit;
  public readonly session: Session;
  private _program?: BaseGearProgram;

  constructor(public api: GearApi, programId?: `0x${string}`) {
    const types: Record<string, any> = {
      Config: {"gas_to_delete_session":"u64","minimum_session_duration_ms":"u64","ms_per_block":"u64"},
      Post: {"id":"u64","author":"[u8;32]","text":"String","image_uri":"Option<String>","created_at":"u64","upvotes":"u32","comment_count":"u32"},
      Comment: {"id":"u64","post_id":"u64","parent_id":"Option<u64>","author":"[u8;32]","text":"String","image_uri":"Option<String>","created_at":"u64","upvotes":"u32","reply_count":"u32"},
      Profile: {"wallet":"[u8;32]","username":"Option<String>","social_handle":"Option<String>","description":"Option<String>","avatar_uri":"Option<String>","created_at":"u64","total_posts":"u32","total_vibes_earned":"u64"},
      SignatureData: {"key":"[u8;32]","duration":"u64","allowed_actions":"Vec<ActionsForSession>"},
      ActionsForSession: {"_enum":["CreatePost","ToggleUpvote","CreateComment","ToggleCommentUpvote","UpdateProfile"]},
      SessionData: {"key":"[u8;32]","expires":"u64","allowed_actions":"Vec<ActionsForSession>","expires_at_block":"u32"},
    }

    this.registry = new TypeRegistry();
    this.registry.setKnownTypes({ types });
    this.registry.register(types);
    if (programId) {
      this._program = new BaseGearProgram(programId, api);
    }

    this.miniReddit = new MiniReddit(this);
    this.session = new Session(this);
  }

  public get programId(): `0x${string}` {
    if (!this._program) throw new Error(`Program ID is not set`);
    return this._program.id;
  }

  newCtorFromCode(code: Uint8Array | Buffer | HexString, config: Config): TransactionBuilder<null> {
    const builder = new TransactionBuilder<null>(
      this.api,
      this.registry,
      'upload_program',
      null,
      'New',
      config,
      'Config',
      'String',
      code,
      async (programId) =>  {
        this._program = await BaseGearProgram.new(programId, this.api);
      }
    );
    return builder;
  }

  newCtorFromCodeId(codeId: `0x${string}`, config: Config) {
    const builder = new TransactionBuilder<null>(
      this.api,
      this.registry,
      'create_program',
      null,
      'New',
      config,
      'Config',
      'String',
      codeId,
      async (programId) =>  {
        this._program = await BaseGearProgram.new(programId, this.api);
      }
    );
    return builder;
  }
}

export class MiniReddit {
  constructor(private _program: SailsProgram) {}

  public createPost(text: string, image_uri: string | null, session_for_account: ActorId | null): TransactionBuilder<{ ok: [number, number] | string | bigint } | { err: string }> {
    if (!this._program.programId) throw new Error('Program ID is not set');
    return new TransactionBuilder<{ ok: [number, number] | string | bigint } | { err: string }>(
      this._program.api,
      this._program.registry,
      'send_message',
      'MiniReddit',
      'CreatePost',
      [text, image_uri, session_for_account],
      '(String, Option<String>, Option<[u8;32]>)',
      'Result<(u64, u64), String>',
      this._program.programId,
    );
  }

  public toggleUpvote(post_id: number | string | bigint, session_for_account: ActorId | null): TransactionBuilder<{ ok: [number, boolean] } | { err: string }> {
    if (!this._program.programId) throw new Error('Program ID is not set');
    return new TransactionBuilder<{ ok: [number, boolean] } | { err: string }>(
      this._program.api,
      this._program.registry,
      'send_message',
      'MiniReddit',
      'ToggleUpvote',
      [post_id, session_for_account],
      '(u64, Option<[u8;32]>)',
      'Result<(u32, bool), String>',
      this._program.programId,
    );
  }

  public getAllPosts(): QueryBuilder<Array<Post>> {
    return new QueryBuilder<Array<Post>>(
      this._program.api,
      this._program.registry,
      this._program.programId,
      'MiniReddit',
      'GetAllPosts',
      null,
      null,
      'Vec<Post>',
    );
  }

  public createComment(post_id: number | string | bigint, parent_id: number | string | bigint | null, text: string, image_uri: string | null, session_for_account: ActorId | null): TransactionBuilder<{ ok: number | string | bigint } | { err: string }> {
    if (!this._program.programId) throw new Error('Program ID is not set');
    return new TransactionBuilder<{ ok: number | string | bigint } | { err: string }>(
      this._program.api,
      this._program.registry,
      'send_message',
      'MiniReddit',
      'CreateComment',
      [post_id, parent_id, text, image_uri, session_for_account],
      '(u64, Option<u64>, String, Option<String>, Option<[u8;32]>)',
      'Result<u64, String>',
      this._program.programId,
    );
  }

  public toggleCommentUpvote(comment_id: number | string | bigint, session_for_account: ActorId | null): TransactionBuilder<{ ok: [number, boolean] } | { err: string }> {
    if (!this._program.programId) throw new Error('Program ID is not set');
    return new TransactionBuilder<{ ok: [number, boolean] } | { err: string }>(
      this._program.api,
      this._program.registry,
      'send_message',
      'MiniReddit',
      'ToggleCommentUpvote',
      [comment_id, session_for_account],
      '(u64, Option<[u8;32]>)',
      'Result<(u32, bool), String>',
      this._program.programId,
    );
  }

  public updateProfile(username: string | null, social_handle: string | null, description: string | null, avatar_uri: string | null, session_for_account: ActorId | null): TransactionBuilder<{ ok: null } | { err: string }> {
    if (!this._program.programId) throw new Error('Program ID is not set');
    return new TransactionBuilder<{ ok: null } | { err: string }>(
      this._program.api,
      this._program.registry,
      'send_message',
      'MiniReddit',
      'UpdateProfile',
      [username, social_handle, description, avatar_uri, session_for_account],
      '(Option<String>, Option<String>, Option<String>, Option<String>, Option<[u8;32]>)',
      'Result<(), String>',
      this._program.programId,
    );
  }

  public getCommentsForPost(post_id: number | string | bigint): QueryBuilder<Array<Comment>> {
    return new QueryBuilder<Array<Comment>>(
      this._program.api,
      this._program.registry,
      this._program.programId,
      'MiniReddit',
      'GetCommentsForPost',
      post_id,
      'u64',
      'Vec<Comment>',
    );
  }

  public getAllComments(): QueryBuilder<Array<Comment>> {
    return new QueryBuilder<Array<Comment>>(
      this._program.api,
      this._program.registry,
      this._program.programId,
      'MiniReddit',
      'GetAllComments',
      null,
      null,
      'Vec<Comment>',
    );
  }

  public getProfile(wallet: ActorId): QueryBuilder<Profile | null> {
    return new QueryBuilder<Profile | null>(
      this._program.api,
      this._program.registry,
      this._program.programId,
      'MiniReddit',
      'GetProfile',
      wallet,
      '[u8;32]',
      'Option<Profile>',
    );
  }

  public getVibesBalance(wallet: ActorId): QueryBuilder<number> {
    return new QueryBuilder<number>(
      this._program.api,
      this._program.registry,
      this._program.programId,
      'MiniReddit',
      'GetVibesBalance',
      wallet,
      '[u8;32]',
      'u64',
    );
  }
}

export class Session {
  constructor(private _program: SailsProgram) {}

  public createSession(signature_data: SignatureData, signature: Uint8Array | null): TransactionBuilder<null> {
    if (!this._program.programId) throw new Error('Program ID is not set');
    
    // CRITICAL: Option<Vec<u8>> SCALE encoding:
    // - None (null) encodes as 0x00 (1 byte)
    // - Some(Vec<u8>) encodes as 0x01 + compact Vec length + Vec<u8> bytes
    // 
    // For a 64-byte signature: 1 (Some=0x01) + 1 (compact length 0x40) + 64 (bytes) = 66 bytes
    // The error "expected at least 66, found 63" suggests the signature is 63 bytes or encoding is wrong
    //
    // SOLUTION: Pass null to encode as None (1 byte) - this is the standard approach
    // The transaction signature itself will serve as authorization
    let finalSig: Uint8Array | null = null;
    
    // If a signature is provided and it's valid, use it
    if (signature && signature.length > 0) {
      // Ensure it's exactly 64 bytes
      if (signature.length === 64) {
        // Verify it's not all zeros
        const isAllZeros = signature.every(byte => byte === 0);
        if (!isAllZeros) {
          finalSig = signature;
          console.log('[Session.createSession] Using provided 64-byte signature');
        } else {
          console.log('[Session.createSession] Signature is all zeros, using null (None) instead');
          finalSig = null;
        }
      } else {
        console.log(`[Session.createSession] Signature length is ${signature.length} (not 64), using null (None) instead`);
        finalSig = null;
      }
    } else {
      console.log('[Session.createSession] No signature provided, using null (None) - transaction signature will be used');
      finalSig = null;
    }
    
    console.log('[Session.createSession] Final signature:', {
      isNull: finalSig === null,
      length: finalSig?.length || 0,
      willEncodeAs: finalSig === null ? 'None (1 byte)' : `Some(Vec<u8>) (${1 + 1 + (finalSig?.length || 0)} bytes)`,
    });
    
    // Pass null to encode as None - this is correct and standard
    // The transaction signature will serve as authorization
    return new TransactionBuilder<null>(
      this._program.api,
      this._program.registry,
      'send_message',
      'Session',
      'CreateSession',
      [signature_data, finalSig], // null encodes as None (0x00)
      '(SignatureData, Option<Vec<u8>>)',
      'Null',
      this._program.programId,
    );
  }

  public deleteSessionFromAccount(): TransactionBuilder<null> {
    if (!this._program.programId) throw new Error('Program ID is not set');
    return new TransactionBuilder<null>(
      this._program.api,
      this._program.registry,
      'send_message',
      'Session',
      'DeleteSessionFromAccount',
      null,
      null,
      'Null',
      this._program.programId,
    );
  }

  public deleteSessionFromProgram(session_for_account: ActorId): TransactionBuilder<null> {
    if (!this._program.programId) throw new Error('Program ID is not set');
    return new TransactionBuilder<null>(
      this._program.api,
      this._program.registry,
      'send_message',
      'Session',
      'DeleteSessionFromProgram',
      session_for_account,
      '[u8;32]',
      'Null',
      this._program.programId,
    );
  }

  public sessionForTheAccount(account: ActorId): QueryBuilder<SessionData | null> {
    return new QueryBuilder<SessionData | null>(
      this._program.api,
      this._program.registry,
      this._program.programId,
      'Session',
      'SessionForTheAccount',
      account,
      '[u8;32]',
      'Option<SessionData>',
    );
  }

  public sessions(): QueryBuilder<Array<[ActorId, SessionData]>> {
    return new QueryBuilder<Array<[ActorId, SessionData]>>(
      this._program.api,
      this._program.registry,
      this._program.programId,
      'Session',
      'Sessions',
      null,
      null,
      'Vec<([u8;32], SessionData)>',
    );
  }

  public subscribeToSessionCreatedEvent(callback: (data: null) => void | Promise<void>): Promise<() => void> {
    return this._program.api.gearEvents.subscribeToGearEvent('UserMessageSent', ({ data: { message } }) => {;
      if (!message.source.eq(this._program.programId) || !message.destination.eq(ZERO_ADDRESS)) {
        return;
      }

      const payload = message.payload.toHex();
      if (getServiceNamePrefix(payload) === 'Session' && getFnNamePrefix(payload) === 'SessionCreated') {
        callback(null);
      }
    });
  }

  public subscribeToSessionDeletedEvent(callback: (data: null) => void | Promise<void>): Promise<() => void> {
    return this._program.api.gearEvents.subscribeToGearEvent('UserMessageSent', ({ data: { message } }) => {;
      if (!message.source.eq(this._program.programId) || !message.destination.eq(ZERO_ADDRESS)) {
        return;
      }

      const payload = message.payload.toHex();
      if (getServiceNamePrefix(payload) === 'Session' && getFnNamePrefix(payload) === 'SessionDeleted') {
        callback(null);
      }
    });
  }
}