import React, { useState, useEffect } from "react";
import { sendToDevvit } from "../utils";
import { useDevvitListener } from "../hooks/useDevvitListener";
import StoryLine from "../components/storyline";

export const HomePage = () => {
  const [storyData, setStoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [contentOverflows, setContentOverflows] = useState(false);

  // Content reference for checking overflow
  const contentRef = React.useRef(null);

  // Listen for responses from Devvit
  const storyResponse = useDevvitListener("STORY_DATA_RESPONSE");
  const storyError = useDevvitListener("STORY_DATA_ERROR");

  // Fetch story data
  useEffect(() => {
    sendToDevvit({
      type: "FETCH_STORY_DATA",
      payload: {},
    });
  }, []);

  // Handle response
  useEffect(() => {
    if (storyResponse) {
      setStoryData(storyResponse.data);
      console.log(storyResponse.data);
      setLoading(false);
    }
  }, [storyResponse]);

  // Handle error
  useEffect(() => {
    if (storyError) {
      setError(storyError.error);
      setLoading(false);
    }
  }, [storyError]);

  // Reset expanded state when changing chapters
  useEffect(() => {
    setExpanded(false);
  }, [currentChapter]);

  // Check if content overflows the container after render and when content changes
  useEffect(() => {
    if (contentRef.current) {
      const checkOverflow = () => {
        const element = contentRef.current;
        setContentOverflows(element.scrollHeight > element.clientHeight);
      };

      checkOverflow();

      // Also check on window resize
      window.addEventListener("resize", checkOverflow);
      return () => window.removeEventListener("resize", checkOverflow);
    }
  }, [storyData, currentChapter]);

  // Navigate between chapters
  const navigateChapter = (direction, chapterId) => {
    setCurrentChapter((prev) => {
      if (direction === "set" && chapterId) return chapterId;

      let newChapter = prev;
      const totalChapters = storyData?.totalChapters || 1;

      if (direction === "prev" && prev > 1) {
        newChapter = prev - 1;
      }
      if (direction === "next" && prev < totalChapters) {
        newChapter = prev + 1;
      }
      return newChapter;
    });
  };

  // Prepare chapters data for StoryLine component
  const chaptersData = storyData
    ? Object.keys(storyData.chapters).map((chapterKey) => ({
        id: parseInt(chapterKey),
        unlocked: true,
        timeRemaining: 0,
      }))
    : [];

  // If still loading or no data
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-lg text-white">Loading your story...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-lg bg-zinc-900 p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-red-400">
            Something went wrong
          </h2>
          <p className="text-white">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!storyData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
        <div className="max-w-md rounded-lg bg-zinc-900 p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-yellow-400">
            No Story Available
          </h2>
          <p className="text-white">
            We couldn't find any story data. The story might still be
            generating.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Get current chapter data
  const currentChapterData = storyData.chapters[currentChapter];

  // Check if chapter content is missing or empty
  const hasContent =
    currentChapterData &&
    currentChapterData.content &&
    currentChapterData.content.trim().length > 0;
  const hasImage = currentChapterData && currentChapterData.image;

  return (
    <div className="h-full bg-zinc-950 text-white">
      {/* Story Timeline */}
      <StoryLine
        currentChapter={currentChapter}
        totalChapters={storyData.totalChapters}
        onNavigate={navigateChapter}
        chapters={chaptersData}
      />

      {/* Chapter content display */}
      <div className="container mx-auto px-4 py-8">
        {/* Chapter Header */}
        <div className="mx-auto mb-6 max-w-3xl">
          <h1 className="mb-2 text-center text-3xl font-bold text-white">
            {currentChapter === 1
              ? "Initial Story"
              : `Chapter ${currentChapter}: ${storyData.storyTitle}`}
          </h1>
        </div>

        {/* Reading container with improved styles */}
        <div className="mx-auto max-w-3xl overflow-hidden rounded-lg bg-zinc-900 shadow-lg">
          {/* Story Image (only rendered if exists) */}
          {hasImage && (
            <div className="w-full">
              <div className="relative h-[250px] w-full overflow-hidden">
                <img
                  src={`data:image/jpeg;base64,${currentChapterData.image}`}
                  alt={`Chapter ${currentChapter} scene`}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Story Content */}
          <div className="p-6">
            {hasContent ? (
              <>
                <div
                  ref={contentRef}
                  className={`prose prose-invert prose-lg leading-relaxed tracking-wide text-zinc-300 transition-all duration-300 ${
                    expanded
                      ? "max-h-[60vh] overflow-y-auto"
                      : "line-clamp-6 max-h-[200px] overflow-hidden"
                  }`}
                  style={{
                    scrollbarWidth: expanded ? "thin" : "none",
                    scrollbarColor: expanded
                      ? "rgba(255,255,255,0.2) transparent"
                      : "transparent transparent",
                  }}
                >
                  {currentChapterData.content}
                </div>

                {/* Only show expand/collapse if content overflows */}
                {contentOverflows && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="relative inline-flex items-center text-indigo-400 transition-colors hover:text-indigo-300"
                    >
                      {expanded ? (
                        <>
                          <span className="text-sm font-medium">Show less</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="ml-1 h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium">
                            Continue reading
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="ml-1 h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-zinc-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto mb-3 h-12 w-12 text-zinc-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-lg">
                  This chapter content is still generating.
                </p>
                <p className="mt-2 text-sm">Check back in a few moments.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chapter Navigation */}
        <div className="mx-auto mt-8 max-w-3xl">
          <div className="flex justify-between">
            <button
              onClick={() => navigateChapter("prev")}
              className={`rounded-lg px-5 py-2.5 ${
                currentChapter > 1
                  ? "bg-zinc-800 text-white transition-colors hover:bg-zinc-700"
                  : "cursor-not-allowed bg-zinc-900 text-zinc-700"
              }`}
              disabled={currentChapter <= 1}
            >
              Previous Chapter
            </button>

            <button
              onClick={() => navigateChapter("next")}
              className={`rounded-lg px-5 py-2.5 ${
                currentChapter < storyData.totalChapters
                  ? "bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
                  : "cursor-not-allowed bg-zinc-900 text-zinc-700"
              }`}
              disabled={currentChapter >= storyData.totalChapters}
            >
              Next Chapter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
