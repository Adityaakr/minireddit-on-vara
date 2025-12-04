#![no_std]

extern crate alloc;

use alloc::string::{String, ToString};
use gstd::{
    collections::BTreeMap,
    exec,
    msg,
    prelude::*,
    ActorId,
};

use mini_reddit_io::{Action, Event, ForumView, PostView};

static mut STATE: Option<State> = None;

const MAX_TEXT_LEN: usize = 280;

#[derive(Default)]
struct State {
    next_id: u64,
    posts: BTreeMap<u64, Post>,
    // one upvote per (post_id, voter)
    upvoted: BTreeMap<(u64, ActorId), ()>,
}

#[derive(Clone)]
struct Post {
    id: u64,
    author: ActorId,
    text: String,
    created_at: u64,
    upvotes: u32,
}

fn state_mut() -> &'static mut State {
    unsafe { STATE.as_mut().expect("STATE is not initialized") }
}

fn state_ref() -> &'static State {
    unsafe { STATE.as_ref().expect("STATE is not initialized") }
}

fn reply(event: Event) {
    msg::reply(event, 0).expect("Failed to reply");
}

#[no_mangle]
extern "C" fn init() {
    unsafe { STATE = Some(State::default()) };
}

#[no_mangle]
extern "C" fn handle() {
    let action: Action = msg::load().expect("Unable to decode Action");
    let sender = msg::source();
    let st = state_mut();

    match action {
        Action::CreatePost { text } => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                return reply(Event::Error { message: "Post text is empty".to_string() });
            }
            if trimmed.len() > MAX_TEXT_LEN {
                return reply(Event::Error {
                    message: format!("Post too long (max {} chars)", MAX_TEXT_LEN),
                });
            }

            let post_id = st.next_id;
            st.next_id = st.next_id.saturating_add(1);

            let created_at = exec::block_timestamp(); // ms timestamp on Gear/Vara

            st.posts.insert(
                post_id,
                Post {
                    id: post_id,
                    author: sender,
                    text: trimmed.to_string(),
                    created_at,
                    upvotes: 0,
                },
            );

            reply(Event::PostCreated { post_id });
        }

        Action::ToggleUpvote { post_id } => {
            let Some(post) = st.posts.get_mut(&post_id) else {
                return reply(Event::Error { message: "Post not found".to_string() });
            };

            let key = (post_id, sender);

            // if already upvoted => remove vote
            if st.upvoted.remove(&key).is_some() {
                if post.upvotes > 0 {
                    post.upvotes -= 1;
                }
                return reply(Event::UpvoteToggled {
                    post_id,
                    upvotes: post.upvotes,
                    is_upvoted: false,
                });
            }

            // otherwise add vote
            st.upvoted.insert(key, ());
            post.upvotes = post.upvotes.saturating_add(1);

            reply(Event::UpvoteToggled {
                post_id,
                upvotes: post.upvotes,
                is_upvoted: true,
            });
        }
    }
}

#[no_mangle]
extern "C" fn state() {
    let st = state_ref();

    let posts = st
        .posts
        .values()
        .cloned()
        .map(|p| PostView {
            id: p.id,
            author: p.author,
            text: p.text,
            created_at: p.created_at,
            upvotes: p.upvotes,
        })
        .collect::<Vec<_>>();

    msg::reply(ForumView { posts }, 0).expect("Failed to share state");
}
