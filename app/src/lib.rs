#![no_std]

use sails_rs::prelude::*;
use session_service::*;

session_service::generate_session_system!(ActionsForSession);

const MAX_TEXT_LEN: usize = 500;
const MAX_COMMENT_LEN: usize = 500;

static mut STATE: Option<ForumState> = None;

#[derive(Clone, Default)]
pub struct ForumState {
    next_id: u64,
    next_comment_id: u64,
    posts: Vec<Post>,
    comments: Vec<Comment>,
    profiles: HashMap<ActorId, Profile>,
    vibes_balances: HashMap<ActorId, u64>,
    upvotes: HashMap<(u64, ActorId), ()>,
    comment_upvoted: HashMap<(u64, ActorId), ()>,
}

#[derive(Clone, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct Post {
    pub id: u64,
    pub author: ActorId,
    pub text: String,
    pub image_uri: Option<String>,
    pub created_at: u64,
    pub upvotes: u32,
    pub comment_count: u32,
}

#[derive(Clone, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct Comment {
    pub id: u64,
    pub post_id: u64,
    pub parent_id: Option<u64>,
    pub author: ActorId,
    pub text: String,
    pub image_uri: Option<String>,
    pub created_at: u64,
    pub upvotes: u32,
    pub reply_count: u32,
}

#[derive(Clone, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct Profile {
    pub wallet: ActorId,
    pub username: Option<String>,
    pub social_handle: Option<String>,
    pub description: Option<String>,
    pub avatar_uri: Option<String>,
    pub created_at: u64,
    pub total_posts: u32,
    pub total_vibes_earned: u64,
}

#[derive(Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum ForumEvent {
    PostCreated { post_id: u64 },
    UpvoteToggled { post_id: u64, upvotes: u32, is_upvoted: bool },
    Error { message: String },
}

#[derive(Clone)]
pub struct MiniRedditService(());

fn state_mut() -> &'static mut ForumState {
    unsafe { STATE.as_mut().expect("State not initialized") }
}

fn state_ref() -> &'static ForumState {
    unsafe { STATE.as_ref().expect("State not initialized") }
}

impl MiniRedditService {
    pub fn new() -> Self {
        Self(())
    }
}

#[derive(Debug, Clone, Encode, Decode, TypeInfo, PartialEq, Eq)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub enum ActionsForSession {
    CreatePost,
    ToggleUpvote,
    CreateComment,
    ToggleCommentUpvote,
    UpdateProfile,
}

fn get_actor(
    session_map: &HashMap<ActorId, SessionData>,
    msg_source: &ActorId,
    session_for_account: &Option<ActorId>,
    action: ActionsForSession,
) -> ActorId {
    match session_for_account {
        Some(account) => {
            let session = session_map
                .get(account)
                .expect("No valid session for this account");

            assert!(
                session.expires > exec::block_timestamp(),
                "Session expired"
            );
            assert!(
                session.allowed_actions.contains(&action),
                "Action not allowed"
            );
            assert_eq!(
                session.key, *msg_source,
                "Sender not authorized for session"
            );
            *account
        }
        None => *msg_source,
    }
}

// Helper function to calculate random vibes reward
fn calculate_vibes_reward() -> u64 {
    let timestamp = exec::block_timestamp();
    let seed = timestamp % 1000;
    (seed % 100) + 1 // Reward between 1-100 vibes
}

#[sails_rs::service]
impl MiniRedditService {
    // Create a new post
    #[export]
    pub fn create_post(&mut self, text: String, image_uri: Option<String>, session_for_account: Option<ActorId>) -> Result<(u64, u64), String> {
        let trimmed = text.trim();
        
        if trimmed.is_empty() && image_uri.is_none() {
            return Err("Post must have text or image".to_string());
        }
        
        if !trimmed.is_empty() && trimmed.len() > MAX_TEXT_LEN {
            return Err(format!("Post too long (max {} chars)", MAX_TEXT_LEN));
        }

        let state = state_mut();
        let post_id = state.next_id;
        state.next_id = state.next_id.saturating_add(1);

        let msg_src = msg::source();
        let sessions = Storage::get_session_map();
        let actor = get_actor(&sessions, &msg_src, &session_for_account, ActionsForSession::CreatePost);

        // Calculate vibes reward
        let vibes_earned = calculate_vibes_reward();
        
        // Update or create profile
        let profile = state.profiles.entry(actor).or_insert_with(|| Profile {
            wallet: actor,
            username: None,
            social_handle: None,
            description: None,
            avatar_uri: None,
            created_at: exec::block_timestamp(),
            total_posts: 0,
            total_vibes_earned: 0,
        });
        profile.total_posts += 1;
        profile.total_vibes_earned += vibes_earned;
        
        // Update vibes balance
        *state.vibes_balances.entry(actor).or_insert(0) += vibes_earned;

        let post = Post {
            id: post_id,
            author: actor,
            text: trimmed.to_string(),
            image_uri,
            created_at: exec::block_timestamp(),
            upvotes: 0,
            comment_count: 0,
        };

        state.posts.push(post);

        Ok((post_id, vibes_earned))
    }

    // Toggle upvote on a post
    #[export]
    pub fn toggle_upvote(&mut self, post_id: u64, session_for_account: Option<ActorId>) -> Result<(u32, bool), String> {
        let state = state_mut();
        let msg_src = msg::source();
        let sessions = Storage::get_session_map();
        let sender = get_actor(&sessions, &msg_src, &session_for_account, ActionsForSession::ToggleUpvote);

        let Some(post) = state.posts.iter_mut().find(|p| p.id == post_id) else {
            return Err("Post not found".to_string());
        };

        let key = (post_id, sender);

        // Check if already upvoted
        if state.upvotes.remove(&key).is_some() {
            // Remove upvote
            if post.upvotes > 0 {
                post.upvotes -= 1;
            }
            Ok((post.upvotes, false))
        } else {
            // Add upvote
            state.upvotes.insert(key, ());
            post.upvotes = post.upvotes.saturating_add(1);
            Ok((post.upvotes, true))
        }
    }

    // Create a comment
    #[export]
    pub fn create_comment(&mut self, post_id: u64, parent_id: Option<u64>, text: String, image_uri: Option<String>, session_for_account: Option<ActorId>) -> Result<u64, String> {
        let trimmed = text.trim();
        
        if trimmed.is_empty() && image_uri.is_none() {
            return Err("Comment must have text or image".to_string());
        }
        
        if !trimmed.is_empty() && trimmed.len() > MAX_COMMENT_LEN {
            return Err(format!("Comment too long (max {} chars)", MAX_COMMENT_LEN));
        }

        let state = state_mut();
        
        // Verify post exists
        let Some(post) = state.posts.iter_mut().find(|p| p.id == post_id) else {
            return Err("Post not found".to_string());
        };

        // If parent_id is Some, verify parent comment exists
        if let Some(pid) = parent_id {
            let Some(parent) = state.comments.iter_mut().find(|c| c.id == pid) else {
                return Err("Parent comment not found".to_string());
            };
            parent.reply_count += 1;
        } else {
            // Top-level comment, increment post comment count
            post.comment_count += 1;
        }

        let comment_id = state.next_comment_id;
        state.next_comment_id = state.next_comment_id.saturating_add(1);

        let msg_src = msg::source();
        let sessions = Storage::get_session_map();
        let actor = get_actor(&sessions, &msg_src, &session_for_account, ActionsForSession::CreateComment);

        let comment = Comment {
            id: comment_id,
            post_id,
            parent_id,
            author: actor,
            text: trimmed.to_string(),
            image_uri,
            created_at: exec::block_timestamp(),
            upvotes: 0,
            reply_count: 0,
        };

        state.comments.push(comment);

        Ok(comment_id)
    }

    // Toggle comment upvote
    #[export]
    pub fn toggle_comment_upvote(&mut self, comment_id: u64, session_for_account: Option<ActorId>) -> Result<(u32, bool), String> {
        let state = state_mut();
        let msg_src = msg::source();
        let sessions = Storage::get_session_map();
        let sender = get_actor(&sessions, &msg_src, &session_for_account, ActionsForSession::ToggleCommentUpvote);

        let Some(comment) = state.comments.iter_mut().find(|c| c.id == comment_id) else {
            return Err("Comment not found".to_string());
        };

        let key = (comment_id, sender);

        if state.comment_upvoted.remove(&key).is_some() {
            if comment.upvotes > 0 {
                comment.upvotes -= 1;
            }
            Ok((comment.upvotes, false))
        } else {
            state.comment_upvoted.insert(key, ());
            comment.upvotes = comment.upvotes.saturating_add(1);
            Ok((comment.upvotes, true))
        }
    }

    // Update profile
    #[export]
    pub fn update_profile(&mut self, username: Option<String>, social_handle: Option<String>, description: Option<String>, avatar_uri: Option<String>, session_for_account: Option<ActorId>) -> Result<(), String> {
        let state = state_mut();
        let msg_src = msg::source();
        let sessions = Storage::get_session_map();
        let actor = get_actor(&sessions, &msg_src, &session_for_account, ActionsForSession::UpdateProfile);

        let profile = state.profiles.entry(actor).or_insert_with(|| Profile {
            wallet: actor,
            username: None,
            social_handle: None,
            description: None,
            avatar_uri: None,
            created_at: exec::block_timestamp(),
            total_posts: 0,
            total_vibes_earned: 0,
        });

        if let Some(u) = username {
            profile.username = Some(u);
        }
        if let Some(s) = social_handle {
            profile.social_handle = Some(s);
        }
        if let Some(d) = description {
            profile.description = Some(d);
        }
        if let Some(a) = avatar_uri {
            profile.avatar_uri = Some(a);
        }

        Ok(())
    }

    // Query: Get all posts
    #[export]
    pub fn get_all_posts(&self) -> Vec<Post> {
        let state = state_ref();
        state.posts.iter().rev().cloned().collect()
    }

    // Query: Get comments for a post
    #[export]
    pub fn get_comments_for_post(&self, post_id: u64) -> Vec<Comment> {
        let state = state_ref();
        state.comments
            .iter()
            .filter(|c| c.post_id == post_id)
            .cloned()
            .collect()
    }

    // Query: Get all comments
    #[export]
    pub fn get_all_comments(&self) -> Vec<Comment> {
        let state = state_ref();
        state.comments.iter().cloned().collect()
    }

    // Query: Get user profile
    #[export]
    pub fn get_profile(&self, wallet: ActorId) -> Option<Profile> {
        let state = state_ref();
        state.profiles.get(&wallet).cloned()
    }

    // Query: Get vibes balance
    #[export]
    pub fn get_vibes_balance(&self, wallet: ActorId) -> u64 {
        let state = state_ref();
        *state.vibes_balances.get(&wallet).unwrap_or(&0)
    }
}

pub struct VibePostProgram(());

#[sails_rs::program]
impl VibePostProgram {
    // Program constructor
    pub fn new(config: Config) -> Self {
        unsafe {
            STATE = Some(ForumState::default());
        }
        SessionService::init(config);
        Self(())
    }

    // Expose the service
    pub fn mini_reddit(&self) -> MiniRedditService {
        MiniRedditService::new()
    }

    // Expose session service for signless transactions
    #[export(route = "Session")]
    pub fn session(&self) -> SessionService {
        SessionService::new()
    }
}

// State function for queries (used by Gear IDEA and frontend)
#[no_mangle]
extern "C" fn state() {
    let state = state_ref();
    let posts: Vec<Post> = state.posts.iter().rev().cloned().collect();
    msg::reply(posts, 0).expect("Failed to share state");
}
