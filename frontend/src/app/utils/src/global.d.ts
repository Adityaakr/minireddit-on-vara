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
    image_uri?: string | null;
    created_at: number | string | bigint;
    upvotes: number;
    comment_count: number;
  }

  export interface Comment {
    id: number | string | bigint;
    post_id: number | string | bigint;
    parent_id?: number | string | bigint | null;
    author: ActorId;
    text: string;
    image_uri?: string | null;
    created_at: number | string | bigint;
    upvotes: number;
    reply_count: number;
  }

  export interface Profile {
    wallet: ActorId;
    username?: string | null;
    social_handle?: string | null;
    description?: string | null;
    avatar_uri?: string | null;
    created_at: number | string | bigint;
    total_posts: number;
    total_vibes_earned: number | string | bigint;
  }

  export interface SignatureData {
    key: ActorId;
    duration: number | string | bigint;
    allowed_actions: Array<ActionsForSession>;
  }

  export type ActionsForSession = "CreatePost" | "ToggleUpvote" | "CreateComment" | "ToggleCommentUpvote" | "UpdateProfile";

  export interface SessionData {
    key: ActorId;
    expires: number | string | bigint;
    allowed_actions: Array<ActionsForSession>;
    expires_at_block: number;
  }
};