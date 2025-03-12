export type Page = "home" | "pokemon";

export type WebviewToBlockMessage =
  | { type: "INIT" }
  | {
      type: "GET_POKEMON_REQUEST";
      payload: { name: string };
    }
  | { type: "GET_TOP_COMMENTS" };

export type BlocksToWebviewMessage =
  | {
      type: "INIT_RESPONSE";
      payload: {
        postId: string;
      };
    }
  | {
      type: "GET_POKEMON_RESPONSE";
      payload: { number: number; name: string; error?: string };
    }
  | {
      type: "TOP_COMMENTS_RESPONSE";
      payload: {
        comments: Array<{
          id: string;
          body: string;
          author: string;
          score: number;
        }>;
      };
    };

export type DevvitMessage = {
  type: "devvit-message";
  data: { message: BlocksToWebviewMessage };
};
