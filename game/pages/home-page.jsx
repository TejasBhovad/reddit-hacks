import { ComponentProps } from "react";
import { useSetPage } from "../hooks/usePage";
import { cn } from "../utils";

export const HomePage = ({ postId }) => {
  const setPage = useSetPage();

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-900">
      <div className="pointer-events-none absolute inset-0 z-20 h-full w-full bg-slate-900 [mask-image:radial-gradient(transparent,white)]" />

      <h1 className={cn("relative z-20 text-xl text-white md:text-4xl")}>
        Welcome to Devvit
      </h1>
      <p className="relative z-20 mt-2 mb-4 text-center text-neutral-300">
        Let's build something awesome!
      </p>
      <img
        src="/assets/default-snoovatar.png"
        alt="default snoovatar picture"
      />
      <p className="relative z-20 mt-2 mb-4 text-center text-neutral-300">
        PostId: {postId}
      </p>
      <button
        className="relative z-20 rounded-lg bg-slate-700 px-4 py-2 text-white"
        onClick={() => {
          setPage("pokemon");
        }}
      >
        Show me more
      </button>
    </div>
  );
};
