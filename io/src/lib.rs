#![no_std]

use gmeta::{InOut, Metadata, Out};
use gstd::{prelude::*, ActorId};
pub use parity_scale_codec::{Decode, Encode};
pub use scale_info::TypeInfo;

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub enum Action {
    CreatePost { text: String, image_uri: Option<String> },
    ToggleUpvote { post_id: u64 },
    CreateComment {
        post_id: u64,
        parent_id: Option<u64>,
        text: String,
        image_uri: Option<String>,
    },
    ToggleCommentUpvote { comment_id: u64 },
    UpdateProfile {
        username: Option<String>,
        social_handle: Option<String>,
        description: Option<String>,
        avatar_uri: Option<String>,
    },
}

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub enum Event {
    PostCreated { post_id: u64, vibes_earned: u64 },
    UpvoteToggled {
        post_id: u64,
        upvotes: u32,
        is_upvoted: bool,
    },
    CommentCreated {
        comment_id: u64,
        post_id: u64,
        parent_id: Option<u64>,
    },
    CommentUpvoteToggled {
        comment_id: u64,
        upvotes: u32,
        is_upvoted: bool,
    },
    ProfileUpdated { wallet: ActorId },
    VibesEarned { wallet: ActorId, amount: u64 },
    Error { message: String },
}

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub struct PostView {
    pub id: u64,
    pub author: ActorId,
    pub text: String,
    pub image_uri: Option<String>,
    pub created_at: u64,
    pub upvotes: u32,
    pub comment_count: u32,
}

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub struct CommentView {
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

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq, Default)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub struct ProfileView {
    pub wallet: ActorId,
    pub username: Option<String>,
    pub social_handle: Option<String>,
    pub description: Option<String>,
    pub avatar_uri: Option<String>,
    pub created_at: u64,
    pub total_posts: u32,
    pub total_vibes_earned: u64,
}

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq, Default)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub struct ForumView {
    pub posts: Vec<PostView>,
}

pub struct ProgramMetadata;

impl Metadata for ProgramMetadata {
    type Init = ();
    type Handle = InOut<Action, Event>;
    type Reply = ();
    type Others = ();
    type Signal = ();
    type State = Out<ForumView>;
}
