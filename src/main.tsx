import { Devvit, useWebView } from "@devvit/public-api";
import { DEVVIT_SETTINGS_KEYS } from "./constants.js";
import { useForm, Context, JSONObject } from "@devvit/public-api";
// import { generateGeminiStory, generateGeminiImage } from "./backend/gemini.js";
import {
  BlocksToWebviewMessage,
  WebviewToBlockMessage,
} from "../game/shared.js";
import { Preview } from "./components/Preview.jsx";
import { getPokemonByName } from "./backend/pokeapi.js";

Devvit.addSettings([
  // Just here as an example
  {
    name: DEVVIT_SETTINGS_KEYS.SECRET_API_KEY,
    label: "API Key for secret things",
    type: "string",
    isSecret: true,
    scope: "app",
  },
  // Add Gemini API key setting
  {
    name: "GEMINI_API_KEY",
    label: "Google Gemini API Key",
    type: "string",
    isSecret: true,
    scope: "app",
  },
]);

Devvit.configure({
  redditAPI: true,
  http: true,
  redis: true,
  realtime: true,
  // scheduler: true,
});

Devvit.addSchedulerJob({
  name: "recurring_task",
  onRun: async (event, context) => {
    // Your code to run every X minutes
    console.log("Scheduled job running!");

    // Example: You could update data, fetch new information, etc.
    // const pokemon = await getPokemonByName('pikachu');
    // await context.redis.set('latest_pokemon', JSON.stringify(pokemon));
  },
});

// Add trigger to schedule the job when app is installed
Devvit.addTrigger({
  event: "AppInstall",
  onEvent: async (_, context) => {
    try {
      const jobId = await context.scheduler.runJob({
        name: "recurring_task",
        cron: "*/5 * * * *", // Runs every 5 minutes
      });

      // Store the job ID to be able to cancel it later if needed
      await context.redis.set("recurring_task_id", jobId);
      console.log("Scheduled job with ID:", jobId);
    } catch (e) {
      console.log("Error scheduling job:", e);
    }
  },
});

Devvit.addMenuItem({
  // Please update as you work on your idea!
  label: "Make my experience post",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      // Title of the post. You'll want to update!
      title: "My first experience post",
      subredditName: subreddit.name,
      preview: <Preview />,
    });
    ui.showToast({ text: "Created post!" });
    ui.navigateTo(post.url);
  },
});
/**
 * Generates an image based on the provided prompt using Google's Gemini model
 * @param prompt - The text prompt to generate an image from
 * @param context - Devvit context
 * @returns Promise containing serialized image data
 */
async function generateGeminiImage(prompt, context) {
  try {
    const apiKey = await context.settings.get("GEMINI_API_KEY");
    const style =
      "Create an anime-style splash screen in a 16:9 aspect ratio. The image should feature vibrant colors, dynamic poses, and a mystical atmosphere, with an emphasis on detailed character designs and magical elements. Include elegant text overlays for chapter titles in a glowing, stylized font. The prompt is as follows:";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp-image-generation:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${style}\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["Text", "Image"],
          },
        }),
      },
    );

    const data = await response.json();

    // Process the response based on Google's API structure
    const images: { base64Data: string; mimeType: string }[] = [];
    if (data.candidates && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith("image/")) {
          images.push({
            base64Data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          });
        }
      }
    }

    console.log(`Generated ${images.length} images`);
    return images;
  } catch (error) {
    console.error("Error generating image:", error);
    return [];
  }
}

/**
 * Generates a story chapter using Google's Gemini model
 * @param prompt - The text containing the story so far
 * @param chapterCount - Total number of chapters in the story
 * @param currentChapter - The current chapter number being generated
 * @param context - Devvit context
 * @returns Promise containing the generated text for the chapter
 */
async function generateGeminiStory(
  prompt,
  chapterCount,
  currentChapter,
  context,
) {
  try {
    const apiKey = await context.settings.get("GEMINI_API_KEY");
    console.log("Generating story with API key:", apiKey);
    const storyProgress = currentChapter / chapterCount;
    console.log(`Generating Chapter ${currentChapter} of ${chapterCount}`);
    let chapterGuidance;
    if (storyProgress < 0.25) {
      chapterGuidance =
        "This is an early chapter. Focus on introducing key characters and establishing the world. Create intrigue and set up future conflicts.";
    } else if (storyProgress < 0.75) {
      chapterGuidance =
        "This is a middle chapter. Develop existing conflicts, reveal character motivations, and increase tension. Avoid introducing too many new elements.";
    } else {
      chapterGuidance =
        "This is among the final chapters. Work toward resolving major conflicts while maintaining tension. Ensure continuity with earlier chapters and prepare for a satisfying conclusion.";
    }

    const enhancedPrompt = `
  You are writing Chapter ${currentChapter} of ${chapterCount} of an original fantasy novel. 
  
  STORY CONTEXT:
  ${prompt}
  
  CHAPTER GUIDANCE:
  ${chapterGuidance}
  
  WRITING INSTRUCTIONS:
  1. Maintain consistent character voices and motivations.
  2. Balance dialogue, action, and description.
  3. Build upon previous events in logical ways.
  4. Include at least one meaningful character development or plot advancement.
  5. End with a hook that leads naturally to the next chapter.
  6. Keep the tone consistent with the existing story.
  7. BE ORIGINAL - avoid common fantasy tropes and predictable outcomes.
  8. DO NOT summarize the story or repeat information - continue the narrative.
  
  FORMAT:
  - Write in third person past tense.
  - Title this chapter appropriately.
  - Write approximately 1000-1500 words.
  - DO NOT include "Chapter ${currentChapter}" in your response.
  - DO NOT end with "To be continued" or similar phrases.
  
  Begin Chapter ${currentChapter}:`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: enhancedPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1500,
            temperature: 0.7,
            topP: 0.9,
            stopSequences: ["Chapter", "THE END", "To be continued"],
          },
        }),
      },
    );

    const data = await response.json();
    console.log("Generated story data:", data);
    // Extract the generated text from the response
    let generatedText = "";
    if (data.candidates && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.text) {
          generatedText += part.text;
        }
      }
    }
    // console.log("Generated story:", generatedText);
    return {
      text: generatedText,
      chapterNumber: currentChapter,
      totalChapters: chapterCount,
    };
  } catch (error) {
    console.error("Error generating story:", error);
    return {
      error: "Failed to generate story chapter",
      message: error,
    };
  }
}

// Add a post type definition
Devvit.addCustomPostType({
  name: "Experience Post",
  height: "tall",
  render: (context) => {
    const { mount } = useWebView<WebviewToBlockMessage, BlocksToWebviewMessage>(
      {
        onMessage: async (event, { postMessage }) => {
          console.log("Received message", event);
          const data = event as unknown as WebviewToBlockMessage;

          switch (data.type) {
            case "INIT":
              postMessage({
                type: "INIT_RESPONSE",
                payload: {
                  postId: context.postId!,
                },
              });
              break;
            case "GET_POKEMON_REQUEST":
              context.ui.showToast({
                text: `Received message: ${JSON.stringify(data)}`,
              });
              const pokemon = await getPokemonByName(data.payload.name);

              postMessage({
                type: "GET_POKEMON_RESPONSE",
                payload: {
                  name: pokemon.name,
                  number: pokemon.id,
                  // Note that we don't allow outside images on Reddit if
                  // wanted to get the sprite. Please reach out to support
                  // if you need this for your app!
                },
              });
              break;
            case "GET_TOP_COMMENTS":
              try {
                const comments = await context.reddit
                  .getComments({
                    postId: context.postId!,
                    limit: 5,
                    sort: "top",
                  })
                  .all();
                // console.log("Comments", comments);

                postMessage({
                  type: "TOP_COMMENTS_RESPONSE",
                  payload: {
                    comments: comments.map((comment) => ({
                      id: comment.id,
                      body: comment.body,
                      author: comment.authorName,
                      score: comment.score,
                    })),
                  },
                });
              } catch (error) {
                console.error("Error fetching comments:", error);
                context.ui.showToast("Failed to fetch comments");
              }
              break;
            // Add these cases to your switch statement in the onMessage handler

            case "GENERATE_STORY_REQUEST":
              try {
                context.ui.showToast("Generating story...");
                console.log(
                  "Generating story with prompt:",
                  data.payload.prompt,
                  "chapterCount:",
                  data.payload.chapterCount,
                  "currentChapter:",
                  data.payload.currentChapter,
                );
                const storyResult = await generateGeminiStory(
                  data.payload.prompt,
                  data.payload.chapterCount || 5,
                  data.payload.currentChapter || 1,
                  context,
                );

                if (storyResult.error) {
                  // Handle error case
                  postMessage({
                    type: "GENERATE_STORY_RESPONSE",
                    success: false,
                    error: storyResult.error,
                    message:
                      typeof storyResult.message === "string"
                        ? storyResult.message
                        : "Unknown error",
                  });
                } else {
                  // Handle success case
                  // console.log("Generated story:", storyResult.text);
                  postMessage({
                    type: "GENERATE_STORY_RESPONSE",
                    success: true,
                    payload: {
                      text: storyResult.text || "",
                      chapterNumber: storyResult.chapterNumber,
                      totalChapters: storyResult.totalChapters,
                    },
                  });
                }
              } catch (error) {
                console.error("Error generating story:", error);
                postMessage({
                  type: "GENERATE_STORY_RESPONSE",
                  success: false,
                  error: "Failed to generate story",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
                context.ui.showToast("Failed to generate story");
              }
              break;

            case "GENERATE_IMAGE_REQUEST":
              try {
                context.ui.showToast("Generating image...");

                const imageResult = await generateGeminiImage(
                  data.payload.prompt,
                  context,
                );

                if (!imageResult || imageResult.length === 0) {
                  postMessage({
                    type: "GENERATE_IMAGE_RESPONSE",
                    success: false,
                    error: "No images generated",
                    message: "The AI model did not return any images",
                  });
                } else {
                  postMessage({
                    type: "GENERATE_IMAGE_RESPONSE",
                    success: true,
                    payload: {
                      images: imageResult,
                      count: imageResult.length,
                    },
                  });
                }
              } catch (error) {
                console.error("Error generating image:", error);
                postMessage({
                  type: "GENERATE_IMAGE_RESPONSE",
                  success: false,
                  error: "Failed to generate image",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
                context.ui.showToast("Failed to generate image");
              }
              break;
            default:
              console.error("Unknown message type", data satisfies never);
              break;
          }
        },
      },
    );
    // Devvit.addCustomPostType({
    //   name: "Story Submission",
    //   render: (context: Context) => {
    //     // Story details
    //     let storyTitle = "";
    //     let storyAuthor = "";
    //     let storyChapters: { title: string; content: string }[] = [];

    //     // Function to submit the story post
    //     async function submitStoryPost() {
    //       const { redis, reddit, ui } = context;
    //       const storyId = `story:${Date.now()}`;

    //       // Save story to Redis
    //       await redis.hset(storyId, {
    //         title: storyTitle,
    //         author: storyAuthor,
    //         chapters: JSON.stringify(storyChapters),
    //         created_at: Date.now().toString(),
    //       });

    //       // Submit to Reddit
    //       const subreddit = await reddit.getCurrentSubreddit();
    //       await reddit.submitPost({
    //         title: `📖 ${storyTitle} by ${storyAuthor}`,
    //         subredditName: subreddit.name,
    //         text: `### Story Title: ${storyTitle}\n👤 Author: ${storyAuthor}\n\n📜 Chapters:\n${storyChapters
    //           .map(
    //             (ch, index) =>
    //               `#### Chapter ${index + 1}: ${ch.title}\n${ch.content}`,
    //           )
    //           .join(
    //             "\n\n",
    //           )}\n\n💬 Add a comment to suggest new chapters or edits!`,
    //       });

    //       ui.showToast({ text: `📢 Story "${storyTitle}" posted!` });

    //       // Reset variables
    //       storyTitle = "";
    //       storyAuthor = "";
    //       storyChapters = [];
    //     }

    //     // Forms
    //     const addMoreForm = useForm(
    //       {
    //         fields: [
    //           {
    //             type: "boolean",
    //             name: "addMore",
    //             label: "Do you want to add another chapter?",
    //           },
    //         ],
    //       },
    //       (values) => {
    //         if (values.addMore) {
    //           context.ui.showForm(chapterForm);
    //         } else {
    //           submitStoryPost();
    //         }
    //       },
    //     );

    //     const chapterForm = useForm(
    //       {
    //         fields: [
    //           {
    //             type: "string",
    //             name: "chapterTitle",
    //             label: "Chapter Title",
    //             placeholder: "Enter chapter title...",
    //             required: true,
    //           },
    //           {
    //             type: "string",
    //             name: "chapterContent",
    //             label: "Chapter Content",
    //             placeholder: "Write the chapter...",
    //             required: true,
    //           },
    //         ],
    //       },
    //       (values) => {
    //         storyChapters.push({
    //           title: values.chapterTitle,
    //           content: values.chapterContent,
    //         });
    //         context.ui.showToast({
    //           text: `✅ Chapter "${values.chapterTitle}" added!`,
    //         });
    //         context.ui.showForm(addMoreForm);
    //       },
    //     );

    //     const authorForm = useForm(
    //       {
    //         fields: [
    //           {
    //             type: "string",
    //             name: "author",
    //             label: "Author's Name",
    //             placeholder: "Enter your name...",
    //             required: true,
    //           },
    //         ],
    //       },
    //       (values) => {
    //         storyAuthor = values.author;
    //         context.ui.showForm(chapterForm);
    //       },
    //     );

    //     const titleForm = useForm(
    //       {
    //         fields: [
    //           {
    //             type: "string",
    //             name: "title",
    //             label: "Story Title",
    //             placeholder: "Enter the story title...",
    //             required: true,
    //           },
    //         ],
    //       },
    //       (values) => {
    //         storyTitle = values.title;
    //         context.ui.showForm(authorForm);
    //       },
    //     );

    //     return (
    //       <vstack height="100%" alignment="center middle" gap="none">
    //         <button onPress={() => context.ui.showForm(titleForm)}>
    //           📜 Start Story Submission
    //         </button>
    //       </vstack>
    //     );
    //   },
    // });

    // // Add a menu item to open the form
    // Devvit.addMenuItem({
    //   location: "subreddit",
    //   label: "Submit a Story",
    //   onPress: async (_event, context: Context) => {
    //     // Declare story data inside the menu item scope
    //     let storyTitle = "";
    //     let storyAuthor = "";
    //     let storyChapters: { title: string; content: string }[] = [];

    //     async function submitStoryPost() {
    //       const { redis, reddit, ui } = context;
    //       const storyId = `story:${Date.now()}`;

    //       await redis.hset(storyId, {
    //         title: storyTitle,
    //         author: storyAuthor,
    //         chapters: JSON.stringify(storyChapters),
    //         created_at: Date.now().toString(),
    //       });

    //       const subreddit = await reddit.getCurrentSubreddit();
    //       await reddit.submitPost({
    //         title: `📖 ${storyTitle} by ${storyAuthor}`,
    //         subredditName: subreddit.name,
    //         text: `### Story Title: ${storyTitle}\n👤 Author: ${storyAuthor}\n\n📜 Chapters:\n${storyChapters
    //           .map(
    //             (ch, index) =>
    //               `#### Chapter ${index + 1}: ${ch.title}\n${ch.content}`,
    //           )
    //           .join(
    //             "\n\n",
    //           )}\n\n💬 Add a comment to suggest new chapters or edits!`,
    //       });

    //       ui.showToast({ text: `📢 Story "${storyTitle}" posted!` });
    //     }

    //     const addMoreForm = useForm(
    //       {
    //         fields: [
    //           {
    //             type: "boolean",
    //             name: "addMore",
    //             label: "Do you want to add another chapter?",
    //           },
    //         ],
    //       },
    //       (values) => {
    //         if (values.addMore) {
    //           context.ui.showForm(chapterForm);
    //         } else {
    //           submitStoryPost();
    //         }
    //       },
    //     );

    //     const chapterForm = useForm(
    //       {
    //         fields: [
    //           {
    //             type: "string",
    //             name: "chapterTitle",
    //             label: "Chapter Title",
    //             placeholder: "Enter chapter title...",
    //             required: true,
    //           },
    //           {
    //             type: "string",
    //             name: "chapterContent",
    //             label: "Chapter Content",
    //             placeholder: "Write the chapter...",
    //             required: true,
    //           },
    //         ],
    //       },
    //       (values) => {
    //         storyChapters.push({
    //           title: values.chapterTitle,
    //           content: values.chapterContent,
    //         });
    //         context.ui.showToast({
    //           text: `✅ Chapter "${values.chapterTitle}" added!`,
    //         });
    //         context.ui.showForm(addMoreForm);
    //       },
    //     );

    //     const authorForm = useForm(
    //       {
    //         fields: [
    //           {
    //             type: "string",
    //             name: "author",
    //             label: "Author's Name",
    //             placeholder: "Enter your name...",
    //             required: true,
    //           },
    //         ],
    //       },
    //       (values) => {
    //         storyAuthor = values.author;
    //         context.ui.showForm(chapterForm);
    //       },
    //     );

    //     const titleForm = useForm(
    //       {
    //         fields: [
    //           {
    //             type: "string",
    //             name: "title",
    //             label: "Story Title",
    //             placeholder: "Enter the story title...",
    //             required: true,
    //           },
    //         ],
    //       },
    //       (values) => {
    //         storyTitle = values.title;
    //         context.ui.showForm(authorForm);
    //       },
    //     );

    //     context.ui.showForm(titleForm);
    //   },
    // });

    return (
      <vstack height="100%" width="100%" alignment="center middle">
        <button
          onPress={() => {
            mount();
          }}
        >
          Launch
        </button>
      </vstack>
    );
  },
});

export default Devvit;
