#![no_std]

use gmeta::metawasm;
use mini_reddit_io::ProgramMetadata;

#[metawasm]
pub mod metafns {
    pub type State = mini_reddit_io::ForumView;

    pub fn get_all_posts(state: State) -> mini_reddit_io::ForumView {
        state
    }
}
