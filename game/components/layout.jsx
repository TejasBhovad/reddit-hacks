/* eslint-disable no-unused-vars */
import { Navigation } from "./navigation";
import { cn } from "../utils";

export const Layout = ({ children, variant = "default" }) => {
  return (
    <div className="flex h-full flex-col">
      {/* Top navigation bar */}
      {variant === "default" && <Navigation />}

      {variant === "sidebar" ? (
        <div className="flex h-full">
          {/* Side navigation */}
          <div className="w-64 bg-slate-800 p-4">
            <Navigation orientation="vertical" />
          </div>

          {/* Main content */}
          <div className="flex-grow overflow-auto">{children}</div>
        </div>
      ) : (
        /* Default layout with top navigation */
        <div className="flex-grow overflow-auto">{children}</div>
      )}
    </div>
  );
};
