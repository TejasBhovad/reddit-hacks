import React from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

const StoryLine = ({
  currentChapter,
  totalChapters,
  onNavigate,
  chapters = [],
}) => {
  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalChapters }, (_, index) => index + 1).map(
          (chapterId, index) => {
            const chapter = chapters.find((c) => c.id === chapterId) || {
              unlocked: false,
            };

            return (
              <React.Fragment key={chapterId}>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    chapterId === currentChapter
                      ? "bg-white text-black"
                      : chapter.unlocked
                        ? "bg-zinc-800 text-white hover:bg-zinc-700"
                        : "cursor-not-allowed bg-zinc-900 text-zinc-600"
                  } relative p-2 transition-colors`}
                  onClick={() =>
                    chapter.unlocked && onNavigate("set", chapterId)
                  }
                >
                  {chapter.unlocked ? chapterId : <Lock size={12} />}

                  {/* Time indicator for locked chapters */}
                  {!chapter.unlocked && chapter.timeRemaining > 0 && (
                    <div className="absolute -bottom-6 text-xs whitespace-nowrap text-zinc-500">
                      {Math.floor(chapter.timeRemaining / 3600)}h left
                    </div>
                  )}
                </div>

                {index < totalChapters - 1 && (
                  <div
                    className={`h-[2px] w-12 ${chapter.unlocked && chapters.find((c) => c.id === chapterId + 1)?.unlocked ? "bg-zinc-600" : "bg-zinc-900"}`}
                  />
                )}
              </React.Fragment>
            );
          },
        )}
      </div>
    </div>
  );
};

export default StoryLine;
