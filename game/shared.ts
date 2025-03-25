export type Page = "home" | "pokemon" | "story" | "image"; // Added new pages

export type WebviewToBlockMessage =
  | { type: "INIT" }
  | {
      type: "GET_POKEMON_REQUEST";
      payload: { name: string };
    }
  | { type: "GET_TOP_COMMENTS" }
  // Story-specific message types
  | { type: "FETCH_STORY_DATA" }
  | {
      type: "GENERATE_STORY_REQUEST";
      payload: {
        prompt: string;
        chapterCount?: number;
        currentChapter?: number;
      };
    }
  | {
      type: "GENERATE_IMAGE_REQUEST";
      payload: {
        prompt: string;
        chapterNumber?: number; // Optional chapter number for saving the image
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
      error?: string;
    }
  // Story data response with chapters and metadata
  | {
      type: "STORY_DATA_RESPONSE";
      payload: {
        data: {
          storyTitle: string;
          totalChapters: number;
          currentChapter: number;
          createdAt: string;
          chapters: {
            [key: string]: {
              content: string;
              image: string;
              topComment: string;
              unlockedAt?: string;
            };
          };
        };
      };
    }
  | {
      type: "STORY_DATA_ERROR";
      error: string;
    }
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
