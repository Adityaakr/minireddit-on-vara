#![no_std]

use gmeta::{InOut, Metadata, Out};
use gstd::{prelude::*, ActorId};
pub use parity_scale_codec::{Decode, Encode};
pub use scale_info::TypeInfo;

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub enum Action {
    CreatePost { text: String },
    ToggleUpvote { post_id: u64 },
}

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub enum Event {
    PostCreated { post_id: u64 },
    UpvoteToggled {
        post_id: u64,
        upvotes: u32,
        is_upvoted: bool,
    },
    Error { message: String },
}

#[derive(Encode, Decode, TypeInfo, Clone, Debug, PartialEq, Eq)]
#[codec(crate = parity_scale_codec)]
#[scale_info(crate = scale_info)]
pub struct PostView {
    pub id: u64,
    pub author: ActorId,
    pub text: String,
    pub created_at: u64,
    pub upvotes: u32,
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
