import { usePage, useSetPage } from "../hooks/usePage";
import { cn } from "../utils";

export const Navigation = ({ orientation = "horizontal" }) => {
  const currentPage = usePage();
  const setPage = useSetPage();

  const pages = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "pokemon", label: "Pokemon", icon: "🎮" },
    { id: "comments", label: "Comments", icon: "🔬" },
    // Add more pages as needed
  ];

  const isVertical = orientation === "vertical";

  return (
    <nav
      className={cn(
        isVertical
          ? "flex flex-col items-start space-y-2"
          : "bg-slate-800 px-4 py-3 shadow-md",
      )}
    >
      {!isVertical && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <img
              src="/assets/default-snoovatar.png"
              alt="Logo"
              className="h-8 w-8"
            />
            <span className="text-lg font-bold text-white">DevApp</span>
          </div>

          <div className="flex space-x-2">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setPage(page.id)}
                className={cn(
                  "rounded px-3 py-1 text-sm transition-colors",
                  currentPage === page.id
                    ? "bg-slate-600 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white",
                )}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isVertical && (
        <>
          <div className="mb-4 flex items-center space-x-1">
            <img
              src="/assets/default-snoovatar.png"
              alt="Logo"
              className="h-8 w-8"
            />
            <span className="text-lg font-bold text-white">DevApp</span>
          </div>

          <div className="w-full space-y-1">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setPage(page.id)}
                className={cn(
                  "flex w-full items-center rounded px-3 py-2 text-left text-sm transition-colors",
                  currentPage === page.id
                    ? "bg-slate-600 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white",
                )}
              >
                <span className="mr-2">{page.icon}</span>
                {page.label}
              </button>
            ))}
          </div>
        </>
      )}
    </nav>
  );
};
