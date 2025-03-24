import { useState } from "react";
import { useSetPage } from "../hooks/usePage";
import { cn } from "../utils";
import StoryLine from "../components/storyline";
import { Lock, Clock } from "lucide-react";

// Sample posts data - in a real app this would come from your API
const samplePosts = [
  {
    id: 1,
    chapter: 1,
    title: "Initial Story",
    text: "The morning sun cast long shadows through the dense jungle canopy as Maya and her team tracked their way through the ancient ruins. The air was thick and humid, but she had to keep moving. Her coordinates led her to this spot, and if her calculations were correct, the artifact would be here. She could feel it in her bones, the same way she had felt the pull of every other relic she'd recovered.",
    image:
      "https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?auto=format&fit=crop&q=80",
    unlocked: true, // ONLY Chapter 1 is unlocked initially
    timeRemaining: 0,
    // First chapter has its own top comment for shaping the next chapter
    topComment: {
      user: "DarkMage007",
      text: "What if Maya discovers that the symbols match a birthmark she's had since childhood? This could explain her strong connection to these artifacts.",
      votes: 42,
      createdAt: "2025-03-23 18:22:15",
    },
  },
  {
    id: 2,
    chapter: 2,
    title: "Chapter 2",
    text: "[Chapter locked]",
    image: "",
    unlocked: false, // Locked
    timeRemaining: 1800, // 30 minutes
    topComment: null,
    // Store the comment that would shape this chapter when unlocked
    shapedByComment: {
      user: "DarkMage007",
      text: "What if Maya discovers that the symbols match a birthmark she's had since childhood? This could explain her strong connection to these artifacts.",
      votes: 42,
      chapter: 1,
    },
  },
  {
    id: 3,
    chapter: 3,
    title: "Chapter 3",
    text: "[Chapter locked]",
    image: "",
    unlocked: false, // Locked
    timeRemaining: 3600, // 1 hour
    topComment: null,
    shapedByComment: {
      user: "CrystalSeer",
      text: "Maybe the crystal responds to Maya's touch in a unique way that surprises everyone!",
      votes: 15,
      chapter: 2,
    },
  },
  {
    id: 4,
    chapter: 4,
    title: "Chapter 4",
    text: "[Chapter locked]",
    image: "",
    unlocked: false, // Locked
    timeRemaining: 7200, // 2 hours
    topComment: null,
    shapedByComment: {
      user: "AdventureSeeker",
      text: "I think Maya should discover the connection between these artifacts and an ancient civilization that disappeared mysteriously!",
      votes: 8,
      chapter: 3,
    },
  },
  {
    id: 5,
    chapter: 5,
    title: "Chapter 5",
    text: "[Chapter locked]",
    image: "",
    unlocked: false, // Locked
    timeRemaining: 10800, // 3 hours
    topComment: null,
    shapedByComment: {
      user: "TimeExplorer",
      text: "What if the artifacts are actually keys to different time periods? Maya could accidentally activate one!",
      votes: 12,
      chapter: 4,
    },
  },
];

// Format time remaining
const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return "Available now";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};

export const HomePage = ({ postId }) => {
  const setPage = useSetPage();
  const [posts, setPosts] = useState(samplePosts);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [debugMode, setDebugMode] = useState(false);

  // Navigate between chapters
  const navigateChapter = (direction, chapterId) => {
    if (direction === "set" && chapterId) {
      // Only navigate to unlocked chapters
      const targetPost = posts.find((p) => p.chapter === chapterId);
      if (targetPost && targetPost.unlocked) {
        setCurrentChapter(chapterId);
      }
      return;
    }

    setCurrentChapter((prev) => {
      let newChapter = prev;
      if (direction === "prev" && prev > 1) {
        newChapter = prev - 1;
      }
      if (direction === "next" && prev < posts.length) {
        const nextPost = posts.find((p) => p.chapter === prev + 1);
        if (nextPost && nextPost.unlocked) {
          newChapter = prev + 1;
        }
      }
      return newChapter;
    });
  };

  // Debug function to unlock next chapter
  const unlockNextChapter = () => {
    setPosts((prevPosts) => {
      return prevPosts.map((post) => {
        if (post.chapter === currentChapter + 1 && !post.unlocked) {
          // Generate new content based on the shaping comment
          let newText = post.text;
          let newImage = "";

          if (post.chapter === 2) {
            newText =
              "Deep within the temple's heart, Maya discovered a chamber bathed in an ethereal blue light. Ancient mechanisms whirred to life as she approached, responding to her presence. The walls were covered in luminescent crystals that pulsed with an inner energy, casting dancing shadows across the weathered stone floor. At the chamber's center stood a pedestal, and upon it, the artifact she sought - a crystalline sphere that seemed to contain swirling galaxies within its depths.\n\nAs she approached, Maya felt a strange tingling sensation on her left shoulder. The birthmark she'd had since childhood - the one shaped like a spiral constellation - began to glow with the same ethereal blue light as the crystals around her. The symbols etched into the chamber walls perfectly matched the pattern on her skin. Suddenly, her lifelong connection to these artifacts made perfect sense.";
            newImage =
              "https://images.unsplash.com/photo-1604537529428-15bcbeecfe4d?auto=format&fit=crop&q=80";
            post.title = "The Birthmark Connection";
          } else if (post.chapter === 3) {
            newText =
              "As Maya reached for the sphere, the chamber's energy intensified. The crystals' pulsing quickened, their light growing brighter with each beat. The air itself seemed to crackle with ancient power. She hesitated for a moment, her hand hovering inches from the artifact's surface. This wasn't just a relic, it was something more, something alive.\n\nWhen her fingers finally touched the crystal's smooth surface, everyone gasped. The sphere responded immediately, changing from blue to a brilliant purple. Streams of light extended from it, forming a map on the chamber ceiling - coordinates to other artifacts. Her team stood in awe, but Maya wasn't surprised. Somehow, she'd always known the artifacts would recognize her touch.";
            newImage =
              "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80";
            post.title = "The Crystal's Response";
          } else {
            newText =
              'Chapter content based on previous comment: "' +
              post.shapedByComment.text +
              '"\n\nThe story continues with more excitement and revelations...';
            newImage = `https://images.unsplash.com/photo-15${post.chapter}${post.chapter}${post.chapter}${post.chapter}${post.chapter}?auto=format&fit=crop&q=80`;
          }

          // Add new top comment for the newly unlocked chapter
          let newTopComment = null;

          if (post.chapter === 2) {
            newTopComment = {
              user: "CrystalSeer",
              text: "Maybe the crystal responds to Maya's touch in a unique way that surprises everyone!",
              votes: 15,
              createdAt: "2025-03-24 10:15:33",
            };
          } else if (post.chapter === 3) {
            newTopComment = {
              user: "AdventureSeeker",
              text: "I think Maya should discover the connection between these artifacts and an ancient civilization that disappeared mysteriously!",
              votes: 8,
              createdAt: CURRENT_DATE,
            };
          } else if (post.chapter === 4) {
            newTopComment = {
              user: "TimeExplorer",
              text: "What if the artifacts are actually keys to different time periods? Maya could accidentally activate one!",
              votes: 12,
              createdAt: CURRENT_DATE,
            };
          } else {
            newTopComment = {
              user: CURRENT_USER,
              text: "Maybe Maya discovers she's actually a descendant of the civilization that created these artifacts!",
              votes: 3,
              createdAt: CURRENT_DATE,
            };
          }

          return {
            ...post,
            unlocked: true,
            timeRemaining: 0,
            text: newText,
            image: newImage,
            topComment: newTopComment,
          };
        }
        return post;
      });
    });
  };

  const currentPost =
    posts.find((p) => p.chapter === currentChapter) || posts[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Debug Controls */}
      {/* <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="rounded-md bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-500"
          >
            {debugMode ? "Hide Debug" : "Show Debug"}
          </button>

          {debugMode && (
            <button
              onClick={unlockNextChapter}
              className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-500"
              disabled={
                !posts.find((p) => p.chapter === currentChapter + 1) ||
                posts.find((p) => p.chapter === currentChapter + 1)?.unlocked
              }
            >
              Unlock Next Chapter
            </button>
          )}
        </div>
      </div> */}

      {/* Story Timeline */}
      <div className="w-full px-4 py-6">
        <StoryLine
          currentChapter={currentChapter}
          totalChapters={posts.length}
          onNavigate={navigateChapter}
          chapters={posts.map((p) => ({
            id: p.chapter,
            unlocked: p.unlocked,
            timeRemaining: p.timeRemaining,
          }))}
        />
      </div>

      {/* Chapter content display */}
      <div className="container mx-auto px-4 py-8">
        {/* Chapter Header */}
        <div className="mx-auto mb-6 max-w-3xl">
          <h1 className="mb-2 text-3xl font-bold text-white">
            {currentPost.chapter === 1
              ? "Initial Story"
              : `Chapter ${currentChapter}: ${currentPost.title}`}
          </h1>

          {/* Locked Status */}
          {!currentPost.unlocked && (
            <div className="mb-8 rounded-lg bg-zinc-800 p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Lock size={48} className="text-yellow-500" />
              </div>
              <h2 className="mb-2 text-xl font-medium">
                This chapter is locked
              </h2>
              <p className="mb-4 text-zinc-400">
                The next chapter will be unlocked in:
              </p>
              <div className="flex items-center justify-center space-x-2">
                <Clock size={18} className="text-zinc-400" />
                <span className="text-yellow-500">
                  {formatTimeRemaining(currentPost.timeRemaining)}
                </span>
              </div>
              <p className="mt-4 text-sm text-zinc-500">
                The content will be generated based on the top-voted comment
                from the previous chapter.
              </p>
            </div>
          )}
        </div>

        {/* Comment That Shaped This Chapter (shown for all chapters except initial story) */}
        {currentChapter > 1 && currentPost.shapedByComment && (
          <div className="mx-auto mb-8 max-w-3xl">
            <div className="mb-2">
              <h2 className="text-lg font-semibold text-zinc-300">
                This chapter was shaped by:
              </h2>
            </div>

            <div className="rounded-lg border border-indigo-500/30 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-zinc-400">
                    {currentPost.shapedByComment.user}
                  </span>
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
                    Top Comment from Ch.{currentPost.shapedByComment.chapter}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {currentPost.shapedByComment.votes} votes
                </div>
              </div>
              <p className="text-zinc-300">
                "{currentPost.shapedByComment.text}"
              </p>
            </div>
          </div>
        )}

        {/* Story Image (only if chapter is unlocked) */}
        {currentPost.unlocked && currentPost.image && (
          <div className="mx-auto mb-8 max-w-3xl">
            <div className="relative h-[400px] w-full overflow-hidden rounded-lg">
              <img
                src={currentPost.image}
                alt={`Chapter ${currentChapter} scene`}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Story Text (only if chapter is unlocked) */}
        {currentPost.unlocked && (
          <div className="mx-auto max-w-3xl space-y-6">
            <p className="leading-relaxed text-zinc-300">{currentPost.text}</p>
          </div>
        )}

        {/* Top Comment for Shaping Next Chapter - only if the chapter is unlocked and has a top comment */}
        {currentPost.unlocked && currentPost.topComment && (
          <div className="mx-auto mt-12 max-w-3xl">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Top Comment</h2>
              <p className="text-sm text-zinc-500">
                This comment will shape Chapter {currentChapter + 1}
              </p>
            </div>

            <div className="rounded-lg border border-indigo-500/30 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-zinc-400">
                    {currentPost.topComment.user}
                  </span>
                  <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
                    Top Comment
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {currentPost.topComment.votes} votes
                </div>
              </div>
              <p className="text-zinc-300">"{currentPost.topComment.text}"</p>
            </div>
          </div>
        )}

        {/* Chapter Navigation */}
        <div className="mx-auto mt-12 max-w-3xl">
          <div className="flex justify-between">
            <button
              onClick={() => navigateChapter("prev")}
              className={`rounded-lg px-4 py-2 ${
                currentChapter > 1
                  ? "bg-zinc-800 text-white hover:bg-zinc-700"
                  : "cursor-not-allowed bg-zinc-900 text-zinc-700"
              }`}
              disabled={currentChapter <= 1}
            >
              Previous Chapter
            </button>

            <button
              onClick={() => navigateChapter("next")}
              className={`rounded-lg px-4 py-2 ${
                currentChapter < posts.length &&
                posts.find((p) => p.chapter === currentChapter + 1)?.unlocked
                  ? "bg-indigo-600 text-white hover:bg-indigo-500"
                  : "cursor-not-allowed bg-zinc-900 text-zinc-700"
              }`}
              disabled={
                currentChapter >= posts.length ||
                !posts.find((p) => p.chapter === currentChapter + 1)?.unlocked
              }
            >
              Next Chapter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
