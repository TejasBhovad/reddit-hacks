export type Page = "home" | "pokemon" | "story" | "image"; // Added new pages

export type WebviewToBlockMessage =
  | { type: "INIT" }
  | {
      type: "GET_POKEMON_REQUEST";
      payload: { name: string };
    }
  | { type: "GET_TOP_COMMENTS" }
  // Add Gemini story generation request
  | {
      type: "GENERATE_STORY_REQUEST";
      payload: {
        prompt: string;
        chapterCount?: number;
        currentChapter?: number;
      };
    }
  // Add Gemini image generation request
  | {
      type: "GENERATE_IMAGE_REQUEST";
      payload: {
        prompt: string;
      };
    };

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
    }
  // Add Gemini story generation response
  | {
      type: "GENERATE_STORY_RESPONSE";
      success: boolean;
      error?: string;
      message?: string;
      payload?: {
        text: string;
        chapterNumber: number;
        totalChapters: number;
      };
    }
  // Add Gemini image generation response
  | {
      type: "GENERATE_IMAGE_RESPONSE";
      success: boolean;
      error?: string;
      message?: string;
      payload?: {
        images: Array<{
          base64Data: string;
          mimeType: string;
        }>;
        count: number;
      };
    };

export type DevvitMessage = {
  type: "devvit-message";
  data: { message: BlocksToWebviewMessage };
};
