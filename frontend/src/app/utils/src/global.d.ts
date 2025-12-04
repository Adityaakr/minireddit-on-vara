import { ActorId } from 'sails-js';

declare global {
  export interface Config {
    gas_to_delete_session: number | string | bigint;
    minimum_session_duration_ms: number | string | bigint;
    ms_per_block: number | string | bigint;
  }

  export interface Post {
    id: number | string | bigint;
    author: ActorId;
    text: string;
    created_at: number | string | bigint;
    upvotes: number;
  }

  export interface SignatureData {
    key: ActorId;
    duration: number | string | bigint;
    allowed_actions: Array<ActionsForSession>;
  }

  export type ActionsForSession = "CreatePost" | "ToggleUpvote";

  export interface SessionData {
    key: ActorId;
    expires: number | string | bigint;
    allowed_actions: Array<ActionsForSession>;
    expires_at_block: number;
  }
};