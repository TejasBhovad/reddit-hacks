import { Devvit, useWebView } from "@devvit/public-api";
import { DEVVIT_SETTINGS_KEYS } from "./constants.js";
import { useForm, Context, JSONObject } from "@devvit/public-api";
import {
  BlocksToWebviewMessage,
  WebviewToBlockMessage,
} from "../game/shared.js";
import { Preview } from "./components/Preview.jsx";
import { getPokemonByName } from "./backend/pokeapi.js";

// Constants for Redis
const REDIS_KEY_EXPIRY_DAYS = 60; // Redis keys expire after 60 days
const REDIS_KEY_EXPIRY_SECONDS = REDIS_KEY_EXPIRY_DAYS * 24 * 60 * 60;
const BATCH_SIZE = 3; // Process stories in batches to avoid timeouts

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
  scheduler: true,
});

// Constants for Redis keys
const STORY_IDS_KEY = "story_ids"; // List of story IDs
const ACTIVE_STORIES_KEY = "active_stories_map"; // JSON object of active stories
const PROCESSING_BATCH_KEY = "processing_batch"; // Currently processing batch

/**
 * Set expiry on Redis key to comply with data retention policies
 */
async function setRedisExpiry(context, key) {
  try {
    await context.redis.expire(key, REDIS_KEY_EXPIRY_SECONDS);
  } catch (error) {
    console.error(`Failed to set expiry on ${key}:`, error);
  }
}

/**
 * Ensure a post ID has the t3_ prefix
 * @param postId - The post ID to standardize
 * @returns The post ID with t3_ prefix
 */
function ensureT3Prefix(postId: string): string {
  if (!postId.startsWith("t3_")) {
    return `t3_${postId}`;
  }
  return postId;
}

/**
 * Get the Redis key for a story's data
 * @param postId - The post ID (with or without t3_ prefix)
 * @returns The standardized Redis key
 */
function getStoryDataKey(postId: string): string {
  const fullPostId = ensureT3Prefix(postId);
  return `post:${fullPostId}:data`;
}

/**
 * Safely get a JSON value from Redis with error handling
 */
async function safeGetJson(context, key, defaultValue = null) {
  try {
    const json = await context.redis.get(key);
    if (!json) return defaultValue;

    return JSON.parse(json);
  } catch (error) {
    console.error(`Error fetching/parsing ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Safely set a JSON value in Redis with error handling
 */
async function safeSetJson(context, key, value) {
  try {
    await context.redis.set(key, JSON.stringify(value));
    await setRedisExpiry(context, key);
    return true;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    return false;
  }
}

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${style}\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "text/plain",
            responseModalities: ["image", "text"],
          },
        }),
      },
    );

    const data = await response.json();

    const images: { base64Data: string; mimeType: string }[] = [];
    if (data.candidates?.[0]?.content?.parts) {
      console.log("Processing image data", data.candidates[0].content);
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push({
            base64Data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          });
        } else if (part.fileData) {
          images.push({
            base64Data: part.fileData.data,
            mimeType: part.fileData.mimeType,
          });
        }
      }
    }
    console.log(`Generated ${images.length} images`);
    // console.log("First image:", images[0]);
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
  topComment = "",
) {
  try {
    const apiKey = await context.settings.get("GEMINI_API_KEY");
    console.log("Generating story with API key:", apiKey ? "Valid" : "Missing");
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

    // Include top comment as audience suggestion if available
    const audienceSuggestion = topComment
      ? `\n\nAUDIENCE SUGGESTION: ${topComment}\nPlease incorporate this suggestion in a natural way while continuing the story.`
      : "";

    const enhancedPrompt = `
  You are writing Chapter ${currentChapter} of ${chapterCount} of an original fantasy novel. 
  
  STORY CONTEXT:
  ${prompt}
  ${audienceSuggestion}
  
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

    // Extract the generated text from the response
    let generatedText = "";
    if (data.candidates && data.candidates[0].content.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.text) {
          generatedText += part.text;
        }
      }
    }
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

/**
 * Gets the top comment from a post
 * @param postId - Reddit post ID
 * @param context - Devvit context
 * @returns The top comment's body text or empty string if none
 */
async function getTopComment(postId, context) {
  try {
    console.log(`Fetching top comments for post ${postId}...`);

    // Ensure post ID has t3_ prefix
    const formattedPostId = postId.startsWith("t3_") ? postId : `t3_${postId}`;

    // Fetch comments from the Reddit API
    const comments = await context.reddit
      .getComments({
        postId: formattedPostId,
        limit: 5, // Get more than 1 in case some are empty or from the bot
        sort: "top", // Sort by top votes
      })
      .all();

    console.log(`Found ${comments.length} comments for post ${postId}`);

    if (comments && comments.length > 0) {
      // Filter out empty comments and find the highest voted substantive comment
      const validComments = comments.filter(
        (comment) => comment.body && comment.body.trim().length > 0,
      );

      if (validComments.length > 0) {
        // Get the top comment
        const topComment = validComments[0].body;
        console.log(`Found top comment: "${topComment.substring(0, 50)}..."`);
        return topComment;
      } else {
        console.log(`No substantive comments found for post ${postId}`);
      }
    } else {
      console.log(`No comments found for post ${postId}`);
    }

    return "";
  } catch (error) {
    console.error(`Error fetching top comment for post ${postId}:`, error);
    return "";
  }
}

/**
 * Deletes all comments from a post
 * @param postId - Reddit post ID
 * @param context - Devvit context
 */
async function deleteAllComments(postId, context) {
  try {
    // Ensure post ID has t3_ prefix
    const formattedPostId = postId.startsWith("t3_") ? postId : `t3_${postId}`;

    const comments = await context.reddit
      .getComments({
        postId: formattedPostId,
        limit: 100, // Maximum allowed per request
      })
      .all();

    console.log(
      `Found ${comments.length} comments to delete from post ${postId}`,
    );

    // For each comment, attempt to remove it using the correct method
    for (const comment of comments) {
      try {
        // Use the correct remove method instead of removeComment
        await context.reddit.remove(comment.id, false);
        console.log(`Removed comment ${comment.id}`);
      } catch (removeError) {
        console.error(`Failed to remove comment ${comment.id}:`, removeError);
      }
    }
  } catch (error) {
    console.error(`Error deleting comments for post ${postId}:`, error);
  }
}

/**
 * Reset and rebuild the active stories list without using hashes
 */
async function forceResetActiveStories(context) {
  try {
    console.log("COMPLETELY RESETTING active stories...");

    // Get saved story IDs from the STORY_IDS_KEY
    const storyIds = await safeGetJson(context, STORY_IDS_KEY, []);

    console.log(`Found ${storyIds.length} saved story IDs:`, storyIds);

    // Create a map of story ID to title and metadata
    const activeStories = {};
    let addedCount = 0;

    for (const fullPostId of storyIds) {
      try {
        // Use standardized key format
        const storyKey = getStoryDataKey(fullPostId);
        console.log(`Checking for story data at ${storyKey}`);

        const storyData = await safeGetJson(context, storyKey);

        if (!storyData) {
          console.log(`No data found for key: ${storyKey}`);
          continue;
        }

        // Add to our active stories map
        activeStories[fullPostId] = {
          title: storyData.storyTitle || "Unknown Story",
          currentChapter: storyData.currentChapter,
          totalChapters: storyData.totalChapters,
          lastUpdated: new Date().toISOString(),
        };

        console.log(
          `✓ Added story "${activeStories[fullPostId].title}" with ID ${fullPostId} to active stories`,
        );
        addedCount++;

        // Refresh expiration on the story data key
        await setRedisExpiry(context, storyKey);
      } catch (error) {
        console.error(`Error processing story ${fullPostId}:`, error);
      }
    }

    // Store the entire map as a JSON string
    await safeSetJson(context, ACTIVE_STORIES_KEY, activeStories);
    console.log(`✓ Reset complete. Added ${addedCount} stories.`);
    console.log("Active stories:", activeStories);

    return addedCount;
  } catch (error) {
    console.error("Error resetting active stories:", error);
    return 0;
  }
}

/**
 * Process a single story for the daily unlock
 */
async function processStory(fullPostId, context) {
  try {
    console.log(`Processing story post: ${fullPostId}`);

    // Use standardized key format
    const storyKey = getStoryDataKey(fullPostId);
    console.log(`Looking for story data at ${storyKey}`);

    const storyData = await safeGetJson(context, storyKey);

    if (!storyData) {
      console.log(`No data found for story ${fullPostId}`);
      return;
    }

    console.log(
      `Retrieved story data for ${fullPostId}:`,
      storyData.storyTitle,
    );

    const { currentChapter, totalChapters, storyTitle, chapters } = storyData;

    // Check if all chapters are already unlocked
    if (parseInt(currentChapter) >= parseInt(totalChapters)) {
      console.log(`All chapters already unlocked for story ${fullPostId}`);
      return;
    }

    // Get the next chapter number
    const nextChapter = parseInt(currentChapter) + 1;
    console.log(`Unlocking chapter ${nextChapter} for story ${fullPostId}`);

    // Get the top comment from the post to use as guidance
    const topComment = await getTopComment(fullPostId, context);

    if (topComment) {
      console.log(
        `Will use top comment for story ${fullPostId}: "${topComment.substring(0, 50)}..."`,
      );
    } else {
      console.log(
        `No top comment found for story ${fullPostId}, will generate without audience input`,
      );
    }

    // Generate content for the new chapter
    // Get previous chapters to use as context
    let storyContext = "";
    for (let i = 1; i <= parseInt(currentChapter); i++) {
      if (chapters[i]) {
        storyContext += `Chapter ${i}:\n${chapters[i].content}\n\n`;
      }
    }

    console.log(
      `Generating story for chapter ${nextChapter} with context length: ${storyContext.length}`,
    );

    // Generate the new chapter
    const chapterResult = await generateGeminiStory(
      storyContext,
      parseInt(totalChapters),
      nextChapter,
      context,
      topComment,
    );

    if (chapterResult.error) {
      console.error(
        `Error generating chapter ${nextChapter} for story ${fullPostId}:`,
        chapterResult.error,
      );
      return;
    }

    console.log(
      `Successfully generated story for chapter ${nextChapter}. Now generating image...`,
    );

    // Generate image for the chapter
    const imageResult = await generateGeminiImage(chapterResult.text, context);
    // console.log("IMAGE RESULT", imageResult);
    let chapterImage = "";
    if (imageResult) {
      chapterImage = imageResult[0].base64Data;
      console.log(`Image generated successfully for chapter ${nextChapter}`);
    } else {
      console.log(`Failed to generate image for chapter ${nextChapter}`);
    }

    // Update story data with the new chapter
    storyData.currentChapter = nextChapter;
    storyData.chapters[nextChapter] = {
      content: chapterResult.text,
      image: chapterImage,
      topComment: topComment, // Store the top comment that influenced this chapter
      unlockedAt: new Date().toISOString(),
    };

    // Save updated story data using the standardized key
    await safeSetJson(context, storyKey, storyData);
    console.log(
      `Saved updated story data for ${fullPostId} using key: ${storyKey}`,
    );

    // Also update the active stories map
    const activeStories = await safeGetJson(context, ACTIVE_STORIES_KEY, {});

    if (activeStories[fullPostId]) {
      activeStories[fullPostId].currentChapter = nextChapter;
      activeStories[fullPostId].lastUpdated = new Date().toISOString();
      await safeSetJson(context, ACTIVE_STORIES_KEY, activeStories);
    }

    // Delete comments from the post to prepare for next chapter's voting
    await deleteAllComments(fullPostId, context);

    console.log(
      `Successfully unlocked chapter ${nextChapter} for story ${fullPostId}`,
    );
  } catch (storyError) {
    console.error(`Error processing story ${fullPostId}:`, storyError);
  }
}

/**
 * Process a batch of stories for the chapter unlock job
 */
async function processBatch(postIds, batchNumber, totalBatches, context) {
  try {
    console.log(
      `Processing batch ${batchNumber}/${totalBatches} with ${postIds.length} stories`,
    );

    // Save the current processing batch information
    await safeSetJson(context, PROCESSING_BATCH_KEY, {
      batchNumber,
      totalBatches,
      postIds,
      startedAt: new Date().toISOString(),
    });

    // Process each story in the batch
    for (const fullPostId of postIds) {
      await processStory(fullPostId, context);
    }

    return true;
  } catch (error) {
    console.error(`Error processing batch ${batchNumber}:`, error);
    return false;
  }
}

/**
 * Schedule the next batch of story processing
 */
async function scheduleNextBatch(postIdBatches, batchNumber, context) {
  if (batchNumber >= postIdBatches.length) {
    console.log("All batches scheduled, chapter unlock job complete");
    return;
  }

  // Schedule the next batch to run in 1 minute
  await context.scheduler.runJob({
    name: "process_story_batch",
    data: {
      batchNumber,
      totalBatches: postIdBatches.length,
      postIds: postIdBatches[batchNumber],
    },
    runAt: new Date(Date.now() + 60000), // 1 minute from now
  });

  console.log(
    `Scheduled batch ${batchNumber + 1}/${postIdBatches.length} to run in 1 minute`,
  );
}

/**
 * Batch processor job
 */
Devvit.addSchedulerJob({
  name: "process_story_batch",
  onRun: async (event, context) => {
    try {
      const { batchNumber, totalBatches, postIds, allBatches } = event.data;

      console.log(
        `Running batch ${batchNumber + 1}/${totalBatches} with ${postIds.length} stories`,
      );

      await processBatch(postIds, batchNumber + 1, totalBatches, context);

      // Schedule the next batch if there are more batches
      if (batchNumber + 1 < totalBatches) {
        // Schedule the next batch to run in 1 minute
        await context.scheduler.runJob({
          name: "process_story_batch",
          data: {
            batchNumber: batchNumber + 1,
            totalBatches: totalBatches,
            postIds: allBatches[batchNumber + 1],
            allBatches: allBatches,
          },
          runAt: new Date(Date.now() + 60000), // 1 minute from now
        });

        console.log(
          `Scheduled batch ${batchNumber + 2}/${totalBatches} to run in 1 minute`,
        );
      } else {
        console.log("All batches processed!");
      }
    } catch (error) {
      console.error("Error in batch processing job:", error);
    }
  },
});
// And update the daily job to pass all batches in the first call
Devvit.addSchedulerJob({
  name: "unlock_daily_chapter",
  onRun: async (_, context) => {
    console.log("Running daily chapter unlock job");

    try {
      // Reset the active stories
      await forceResetActiveStories(context);

      // Get active stories map
      const activeStories = await safeGetJson(context, ACTIVE_STORIES_KEY, {});
      const postIds = Object.keys(activeStories);

      console.log(`Found ${postIds.length} active stories:`, postIds);

      if (postIds.length === 0) {
        console.log("No active stories found. Exiting job.");
        return;
      }

      // Split stories into smaller batches to avoid timeouts
      const postIdBatches = [];
      for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
        postIdBatches.push(postIds.slice(i, i + BATCH_SIZE));
      }

      console.log(
        `Split ${postIds.length} stories into ${postIdBatches.length} batches of ${BATCH_SIZE}`,
      );

      // Process the first batch immediately
      await processBatch(postIdBatches[0], 1, postIdBatches.length, context);

      // Schedule the remaining batches with the first job
      if (postIdBatches.length > 1) {
        // Schedule the second batch with information about all batches
        await context.scheduler.runJob({
          name: "process_story_batch",
          data: {
            batchNumber: 1,
            totalBatches: postIdBatches.length,
            postIds: postIdBatches[1],
            allBatches: postIdBatches,
          },
          runAt: new Date(Date.now() + 60000), // 1 minute from now
        });

        console.log(
          `Scheduled batch 2/${postIdBatches.length} to run in 1 minute`,
        );
      } else {
        console.log("All stories processed in a single batch");
      }
    } catch (error) {
      console.error("Error in daily chapter unlock job:", error);
    }
  },
});

// Handle comment deletion events to comply with content deletion policy
Devvit.addTrigger({
  event: "CommentDelete",
  onEvent: async (event, context) => {
    try {
      console.log(
        `Comment ${event.commentId} was deleted, updating related data`,
      );

      // For now, we don't need to do anything specific here
      // but this handler is required for compliance with Devvit's content deletion policy
    } catch (error) {
      console.error("Error handling comment deletion:", error);
    }
  },
});

// Add trigger to schedule the daily chapter unlock job when app is installed
Devvit.addTrigger({
  event: "AppInstall",
  onEvent: async (_, context) => {
    try {
      // Schedule recurring task
      const recurringJobId = await context.scheduler.runJob({
        name: "recurring_task",
        cron: "*/5 * * * *", // Runs every 5 minutes
      });

      // Store the job ID to be able to cancel it later if needed
      await context.redis.set("recurring_task_id", recurringJobId);
      console.log("Scheduled recurring job with ID:", recurringJobId);

      // Schedule daily chapter unlock job - runs at midnight (00:00) every day
      const chapterJobId = await context.scheduler.runJob({
        name: "unlock_daily_chapter",
        cron: "0 0 * * *", // At midnight every day
      });

      // Store the job ID
      await context.redis.set("unlock_chapter_job_id", chapterJobId);
      console.log("Scheduled daily chapter unlock job with ID:", chapterJobId);

      // Do a complete reset of active stories to start fresh
      await forceResetActiveStories(context);
    } catch (e) {
      console.log("Error scheduling jobs:", e);
    }
  },
});

// Create the form at the root level for use in the menu item
const initialStoryForm = Devvit.createForm(
  {
    fields: [
      {
        name: "storyTitle",
        label: "Story Title",
        type: "string",
        required: true,
      },
      {
        name: "initStory",
        label: "Initial Story (Chapter 1)",
        type: "paragraph",
        required: true,
      },
      {
        name: "totalChapters",
        label: "Total Chapters",
        type: "number",
        required: true,
        defaultValue: 3,
        min: 1,
        max: 10,
      },
    ],
    title: "Create Story Experience",
    acceptLabel: "Create Post",
  },
  async (event, context) => {
    try {
      context.ui.showToast({ text: "Creating your story..." });

      // Parse form data
      const storyTitle = event.values.storyTitle;
      const initStory = event.values.initStory;
      const totalChapters = event.values.totalChapters.toString();

      // Generate image using the story content
      context.ui.showToast({ text: "Generating image for Chapter 1..." });
      const imageResult = await generateGeminiImage(initStory, context);

      // Get base64 image data
      let chapterImage = "";
      if (imageResult) {
        chapterImage = imageResult[0].base64Data;
        context.ui.showToast({ text: "Image generated successfully!" });
      }

      // Create a post with the story
      const subreddit = await context.reddit.getCurrentSubreddit();
      const post = await context.reddit.submitPost({
        title: storyTitle,
        subredditName: subreddit.name,
        preview: <Preview />,
      });

      const fullPostId = post.id; // This should include the t3_ prefix
      console.log(`Created new post with ID: ${fullPostId}`);

      // Prepare story data structure
      const storyData = {
        storyTitle,
        totalChapters,
        currentChapter: 1, // First chapter is already unlocked
        createdAt: new Date().toISOString(),
        chapters: {
          1: {
            content: initStory,
            image: chapterImage,
            topComment: "",
            unlockedAt: new Date().toISOString(), // First chapter is unlocked immediately
          },
          // Additional chapters will be unlocked daily
        },
      };

      // Save the story data to Redis using standardized key format
      const storyKey = getStoryDataKey(fullPostId);
      await safeSetJson(context, storyKey, storyData);

      // Add this story to our story IDs list
      const storyIds = await safeGetJson(context, STORY_IDS_KEY, []);

      // Add the new ID and save
      if (!storyIds.includes(fullPostId)) {
        storyIds.push(fullPostId);
        await safeSetJson(context, STORY_IDS_KEY, storyIds);
        console.log(`Updated story IDs list with ${fullPostId}`);
      }

      // Also add to the active stories map
      const activeStories = await safeGetJson(context, ACTIVE_STORIES_KEY, {});

      activeStories[fullPostId] = {
        title: storyTitle,
        currentChapter: 1,
        totalChapters: totalChapters,
        lastUpdated: new Date().toISOString(),
      };

      await safeSetJson(context, ACTIVE_STORIES_KEY, activeStories);
      console.log(`Added story to active stories map with ID: ${fullPostId}`);

      console.log(
        `Created new story "${storyTitle}" with post ID: ${fullPostId}`,
      );
      context.ui.showToast("Story created successfully!");

      // Navigate to the new post
      context.ui.navigateTo(post.url);
    } catch (error) {
      console.error("Error creating story:", error);
      context.ui.showToast("Error creating story. Please try again.");
    }
  },
);

// Add a menu item to force reset the active stories
Devvit.addMenuItem({
  label: "Force Reset Active Stories",
  location: "subreddit",
  forUserType: "moderator", // Only visible to moderators
  onPress: async (_, context) => {
    try {
      context.ui.showToast({
        text: "Completely resetting active stories...",
      });
      const count = await forceResetActiveStories(context);
      context.ui.showToast({
        text: `Active stories reset with ${count} stories!`,
      });
    } catch (error) {
      console.error("Error resetting active stories:", error);
      context.ui.showToast({ text: "Error resetting active stories" });
    }
  },
});

// Add a menu item to manually add a story to the active stories map
Devvit.addMenuItem({
  label: "Add Story to Active Stories",
  location: "post",
  forUserType: "moderator",
  onPress: async (_, context) => {
    try {
      // Access post ID from context when in post location
      const postId = context.postId;

      if (!postId) {
        context.ui.showToast({ text: "Could not determine post ID" });
        return;
      }

      const fullPostId = ensureT3Prefix(postId);
      console.log(
        `Adding story with post ID ${fullPostId} to active stories...`,
      );

      // Check if the story data exists using standardized key format
      const storyKey = getStoryDataKey(fullPostId);
      const storyData = await safeGetJson(context, storyKey);

      if (!storyData) {
        context.ui.showToast({ text: "No story data found for this post" });
        return;
      }

      const storyTitle = storyData.storyTitle || "Unknown Story";

      // Get the current active stories map
      const activeStories = await safeGetJson(context, ACTIVE_STORIES_KEY, {});

      // Add this story to the map
      activeStories[fullPostId] = {
        title: storyTitle,
        currentChapter: storyData.currentChapter,
        totalChapters: storyData.totalChapters,
        lastUpdated: new Date().toISOString(),
      };

      // Save the updated map
      await safeSetJson(context, ACTIVE_STORIES_KEY, activeStories);

      // Also add to our story IDs list if not already there
      const storyIds = await safeGetJson(context, STORY_IDS_KEY, []);

      if (!storyIds.includes(fullPostId)) {
        storyIds.push(fullPostId);
        await safeSetJson(context, STORY_IDS_KEY, storyIds);
        console.log(`Updated story IDs list with ${fullPostId}`);
      }

      context.ui.showToast({
        text: `Added "${storyTitle}" to active stories!`,
      });
    } catch (error) {
      console.error("Error adding story to active stories:", error);
      context.ui.showToast({ text: "Error adding story" });
    }
  },
});

// Add debug menu item to check post data and fix tracking
Devvit.addMenuItem({
  label: "Debug Post Data",
  location: "post",
  forUserType: "moderator",
  onPress: async (_, context) => {
    try {
      // Access post ID from context when in post location
      const postId = context.postId;

      if (!postId) {
        context.ui.showToast({ text: "Could not determine post ID" });
        return;
      }

      const fullPostId = ensureT3Prefix(postId);
      const storyKey = getStoryDataKey(fullPostId);
      const storyData = await safeGetJson(context, storyKey);

      if (storyData) {
        context.ui.showToast({
          text: `Found story: ${storyData.storyTitle} (${storyData.currentChapter}/${storyData.totalChapters})`,
        });

        // Also add to story IDs if not present
        const storyIds = await safeGetJson(context, STORY_IDS_KEY, []);

        if (!storyIds.includes(fullPostId)) {
          storyIds.push(fullPostId);
          await safeSetJson(context, STORY_IDS_KEY, storyIds);

          // Update active stories map
          const activeStories = await safeGetJson(
            context,
            ACTIVE_STORIES_KEY,
            {},
          );

          activeStories[fullPostId] = {
            title: storyData.storyTitle,
            currentChapter: storyData.currentChapter,
            totalChapters: storyData.totalChapters,
            lastUpdated: new Date().toISOString(),
          };

          await safeSetJson(context, ACTIVE_STORIES_KEY, activeStories);

          context.ui.showToast({ text: "Added story to tracking system!" });
        } else {
          context.ui.showToast({ text: "Story already in tracking system" });
        }
      } else {
        context.ui.showToast({
          text: "No story data found for this post",
        });
      }
    } catch (error) {
      console.error("Error in debug function:", error);
      context.ui.showToast({ text: "Error checking post data" });
    }
  },
});

// Initial story creation form menu item
Devvit.addMenuItem({
  label: "Create Story Experience",
  location: "subreddit",
  onPress: (_, context) => {
    // Use the form defined at the root level
    context.ui.showForm(initialStoryForm);
  },
});

// Add a manual trigger menu item for testing chapter unlock
Devvit.addMenuItem({
  label: "Test Daily Chapter Unlock",
  location: "subreddit",
  forUserType: "moderator", // Only visible to moderators
  onPress: async (_, context) => {
    try {
      context.ui.showToast({ text: "Running chapter unlock job..." });

      // Reset active stories first
      await forceResetActiveStories(context);

      // Then run the job
      await context.scheduler.runJob({
        name: "unlock_daily_chapter",
        runAt: new Date(),
      });
      context.ui.showToast({ text: "Chapter unlock job initiated!" });
    } catch (error) {
      console.error("Error running chapter unlock job:", error);
      context.ui.showToast({ text: "Error running chapter unlock job" });
    }
  },
});

// Add a menu item to view all active stories
Devvit.addMenuItem({
  label: "View All Active Stories",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_, context) => {
    try {
      const activeStories = await safeGetJson(context, ACTIVE_STORIES_KEY, {});
      const storyCount = Object.keys(activeStories).length;

      if (storyCount === 0) {
        context.ui.showToast({ text: "No active stories found" });
        return;
      }

      // Show count in toast
      context.ui.showToast({
        text: `Found ${storyCount} active stories. Check console for details.`,
      });

      // Log details to console
      console.log("=== ACTIVE STORIES ===");
      for (const [id, data] of Object.entries(activeStories)) {
        console.log(
          `${id}: "${data.title}" - Chapter ${data.currentChapter}/${data.totalChapters}`,
        );
      }
      console.log("=====================");
    } catch (error) {
      console.error("Error viewing active stories:", error);
      context.ui.showToast({ text: "Error viewing active stories" });
    }
  },
});

// Add a menu item to test batch processing
Devvit.addMenuItem({
  label: "Test Batch Processing",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_, context) => {
    try {
      const activeStories = await safeGetJson(context, ACTIVE_STORIES_KEY, {});
      const postIds = Object.keys(activeStories);

      if (postIds.length === 0) {
        context.ui.showToast({ text: "No active stories found" });
        return;
      }

      // Split into batches
      const postIdBatches = [];
      for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
        postIdBatches.push(postIds.slice(i, i + BATCH_SIZE));
      }

      context.ui.showToast({
        text: `Processing ${postIds.length} stories in ${postIdBatches.length} batches`,
      });

      // Process the first batch immediately
      await processBatch(postIdBatches[0], 1, postIdBatches.length, context);

      // Schedule remaining batches
      if (postIdBatches.length > 1) {
        await scheduleNextBatch(postIdBatches, 1, context);
        context.ui.showToast({
          text: `First batch processed, ${postIdBatches.length - 1} more scheduled`,
        });
      } else {
        context.ui.showToast({
          text: "All stories processed in a single batch",
        });
      }
    } catch (error) {
      console.error("Error in batch processing test:", error);
      context.ui.showToast({ text: "Error testing batch processing" });
    }
  },
});

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
            case "FETCH_STORY_DATA":
              try {
                // Use standardized key format for fetching story data
                const fullPostId = context.postId!;
                const storyKey = getStoryDataKey(fullPostId);
                console.log(`Fetching story data from ${storyKey}`);

                const storyData = await safeGetJson(context, storyKey);

                if (storyData) {
                  console.log("Fetched story data successfully");
                  postMessage({
                    type: "STORY_DATA_RESPONSE",
                    payload: {
                      data: storyData,
                    },
                  });
                } else {
                  console.log(`No story data found for key ${storyKey}`);
                  postMessage({
                    type: "STORY_DATA_ERROR",
                    error: "No story data found",
                  });
                }
              } catch (error) {
                console.error("Error fetching story data:", error);
                postMessage({
                  type: "STORY_DATA_ERROR",
                  error: "Failed to fetch story data",
                });
              }
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
                  // Generate image using the story content
                  context.ui.showToast("Generating image for the chapter...");
                  const storyText = storyResult.text || "";
                  const imageResult = await generateGeminiImage(
                    storyText,
                    context,
                  );

                  let chapterImage = "";
                  if (imageResult && imageResult.length > 0) {
                    chapterImage = imageResult[0].base64Data;
                  }

                  // Return both the story and the generated image
                  postMessage({
                    type: "GENERATE_STORY_RESPONSE",
                    success: true,
                    payload: {
                      text: storyText,
                      chapterNumber: storyResult.chapterNumber,
                      totalChapters: storyResult.totalChapters,
                      image: chapterImage, // Include the generated image
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

                // Use the story content from the request as the image prompt
                const imageResult = await generateGeminiImage(
                  data.payload.content || data.payload.prompt,
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
              console.error("Unknown message type", data);
              break;
          }
        },
      },
    );

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
