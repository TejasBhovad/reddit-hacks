import { Navigation } from "./navigation";
import { cn } from "../utils";
import React, { useState, useEffect } from "react";
import { sendToDevvit } from "../utils";
import { useDevvitListener } from "../hooks/useDevvitListener";
import StoryLine from "../components/storyline";

export const Layout = ({ children, variant = "default" }) => {
  return (
    <div className="flex h-full flex-col">
      {variant === "sidebar" ? (
        <div className="flex h-full">
          <div className="w-64 bg-zinc-950 p-4">
            <Navigation orientation="vertical" />
          </div>
          <div className="flex-grow overflow-auto">{children}</div>
        </div>
      ) : (
        <div className="flex-grow overflow-auto">{children}</div>
      )}
    </div>
  );
};
export default Layout;
