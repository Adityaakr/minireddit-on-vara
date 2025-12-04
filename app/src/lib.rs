#![no_std]

use sails_rs::prelude::*;
use session_service::*;

session_service::generate_session_system!(ActionsForSession);

const MAX_TEXT_LEN: usize = 280;

static mut STATE: Option<ForumState> = None;

#[derive(Clone, Default)]
pub struct ForumState {
    next_id: u64,
    posts: Vec<Post>,
    upvotes: HashMap<(u64, ActorId), ()>,
}

#[derive(Clone, Encode, Decode, TypeInfo)]
#[codec(crate = sails_rs::scale_codec)]
#[scale_info(crate = sails_rs::scale_info)]
pub struct Post {
    pub id: u64,
    pub author: ActorId,
    pub text: String,
    pub created_at: u64,
    pub upvotes: u32,
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

#[sails_rs::service]
impl MiniRedditService {
    // Create a new post
    #[export]
    pub fn create_post(&mut self, text: String, session_for_account: Option<ActorId>) -> Result<u64, String> {
        let trimmed = text.trim();
        
        if trimmed.is_empty() {
            return Err("Post text is empty".to_string());
        }
        
        if trimmed.len() > MAX_TEXT_LEN {
            return Err(format!("Post too long (max {} chars)", MAX_TEXT_LEN));
        }

        let state = state_mut();
        let post_id = state.next_id;
        state.next_id = state.next_id.saturating_add(1);

        let msg_src = msg::source();
        let sessions = Storage::get_session_map();
        let actor = get_actor(&sessions, &msg_src, &session_for_account, ActionsForSession::CreatePost);

        let post = Post {
            id: post_id,
            author: actor,
            text: trimmed.to_string(),
            created_at: exec::block_timestamp(),
            upvotes: 0,
        };

        state.posts.push(post);

        Ok(post_id)
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

    // Query: Get all posts
    #[export]
    pub fn get_all_posts(&self) -> Vec<Post> {
        let state = state_ref();
        state.posts.iter().rev().cloned().collect()
    }
}

pub struct MiniRedditProgram(());

#[sails_rs::program]
impl MiniRedditProgram {
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
