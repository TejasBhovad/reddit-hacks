/* eslint-disable no-unused-vars */
import { HomePage } from "./pages/home-page";
import { PokemonPage } from "./pages/pokemon-page";
import CommentPage from "./pages/comments-page";
import { usePage } from "./hooks/usePage";
import { useEffect, useState } from "react";
import { sendToDevvit } from "./utils";
import { useDevvitListener } from "./hooks/useDevvitListener";
import { Layout } from "./components/layout";

const getPage = (page, { postId }) => {
  switch (page) {
    case "home":
      return <HomePage postId={postId} />;
    case "pokemon":
      return <PokemonPage />;
    case "comments":
      return <CommentPage />;
    default:
      throw new Error(`Unknown page: ${page}`);
  }
};

export const App = () => {
  const [postId, setPostId] = useState("");
  const page = usePage();
  const initData = useDevvitListener("INIT_RESPONSE");
  const [layoutVariant, setLayoutVariant] = useState("default");

  useEffect(() => {
    // Send an INIT message to Devvit, handled in src/main.tsx
    sendToDevvit({ type: "INIT" });
  }, []);

  // get the PostID from the INIT_RESPONSE message
  useEffect(() => {
    if (initData) {
      setPostId(initData.postId);
    }
  }, [initData, setPostId]);

  return <Layout variant={layoutVariant}>{getPage(page, { postId })}</Layout>;
};
