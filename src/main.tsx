import { Devvit, useWebView,useForm, Context, JSONObject} from "@devvit/public-api";
import { DEVVIT_SETTINGS_KEYS } from "./constants.js";
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
]);

Devvit.configure({
  redditAPI: true,
  http: true,
  redis: true,
  realtime: true,
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
            default:
              console.error("Unknown message type", data satisfies never);
              break;
          }
        },
      },
    );
Devvit.addCustomPostType({
  name: 'Story Submission',
  render: (context: Context) => {
    // Story details
    let storyTitle = '';
    let storyAuthor = '';
    let storyChapters: { title: string; content: string }[] = [];

    // Function to submit the story post
    async function submitStoryPost() {
      const { redis, reddit, ui } = context;
      const storyId = `story:${Date.now()}`;

      // Save story to Redis
      await redis.hset(storyId, {
        title: storyTitle,
        author: storyAuthor,
        chapters: JSON.stringify(storyChapters),
        created_at: Date.now().toString(),
      });

      // Submit to Reddit
      const subreddit = await reddit.getCurrentSubreddit();
      await reddit.submitPost({
        title: `📖 ${storyTitle} by ${storyAuthor}`,
        subredditName: subreddit.name,
        text: `### Story Title: ${storyTitle}\n👤 Author: ${storyAuthor}\n\n📜 Chapters:\n${storyChapters
          .map((ch, index) => `#### Chapter ${index + 1}: ${ch.title}\n${ch.content}`)
          .join('\n\n')}\n\n💬 Add a comment to suggest new chapters or edits!`,
      });

      ui.showToast({ text: `📢 Story "${storyTitle}" posted!` });

      // Reset variables
      storyTitle = '';
      storyAuthor = '';
      storyChapters = [];
    }

    // Forms
    const addMoreForm = useForm(
      {
        fields: [
          {
            type: 'boolean',
            name: 'addMore',
            label: 'Do you want to add another chapter?',
          },
        ],
      },
      (values) => {
        if (values.addMore) {
          context.ui.showForm(chapterForm);
        } else {
          submitStoryPost();
        }
      }
    );

    const chapterForm = useForm(
      {
        fields: [
          {
            type: 'string',
            name: 'chapterTitle',
            label: 'Chapter Title',
            placeholder: 'Enter chapter title...',
            required: true,
          },
          {
            type: 'string',
            name: 'chapterContent',
            label: 'Chapter Content',
            placeholder: 'Write the chapter...',
            required: true,
          },
        ],
      },
      (values) => {
        storyChapters.push({ title: values.chapterTitle, content: values.chapterContent });
        context.ui.showToast({ text: `✅ Chapter "${values.chapterTitle}" added!` });
        context.ui.showForm(addMoreForm);
      }
    );

    const authorForm = useForm(
      {
        fields: [
          {
            type: 'string',
            name: 'author',
            label: "Author's Name",
            placeholder: 'Enter your name...',
            required: true,
          },
        ],
      },
      (values) => {
        storyAuthor = values.author;
        context.ui.showForm(chapterForm);
      }
    );

    const titleForm = useForm(
      {
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Story Title',
            placeholder: 'Enter the story title...',
            required: true,
          },
        ],
      },
      (values) => {
        storyTitle = values.title;
        context.ui.showForm(authorForm);
      }
    );

    return (
      <vstack height="100%" alignment="center middle" gap="none">
        <button onPress={() => context.ui.showForm(titleForm)}>📜 Start Story Submission</button>
      </vstack>
    );
  },
});

// Add a menu item to open the form
Devvit.addMenuItem({
  location: 'subreddit',
  label: 'Submit a Story',
  onPress: async (_event, context: Context) => {
    // Declare story data inside the menu item scope
    let storyTitle = '';
    let storyAuthor = '';
    let storyChapters: { title: string; content: string }[] = [];

    async function submitStoryPost() {
      const { redis, reddit, ui } = context;
      const storyId = `story:${Date.now()}`;

      await redis.hset(storyId, {
        title: storyTitle,
        author: storyAuthor,
        chapters: JSON.stringify(storyChapters),
        created_at: Date.now().toString(),
      });

      const subreddit = await reddit.getCurrentSubreddit();
      await reddit.submitPost({
        title: `📖 ${storyTitle} by ${storyAuthor}`,
        subredditName: subreddit.name,
        text: `### Story Title: ${storyTitle}\n👤 Author: ${storyAuthor}\n\n📜 Chapters:\n${storyChapters
          .map((ch, index) => `#### Chapter ${index + 1}: ${ch.title}\n${ch.content}`)
          .join('\n\n')}\n\n💬 Add a comment to suggest new chapters or edits!`,
      });

      ui.showToast({ text: `📢 Story "${storyTitle}" posted!` });
    }

    const addMoreForm = useForm(
      {
        fields: [
          {
            type: 'boolean',
            name: 'addMore',
            label: 'Do you want to add another chapter?',
          },
        ],
      },
      (values) => {
        if (values.addMore) {
          context.ui.showForm(chapterForm);
        } else {
          submitStoryPost();
        }
      }
    );

    const chapterForm = useForm(
      {
        fields: [
          {
            type: 'string',
            name: 'chapterTitle',
            label: 'Chapter Title',
            placeholder: 'Enter chapter title...',
            required: true,
          },
          {
            type: 'string',
            name: 'chapterContent',
            label: 'Chapter Content',
            placeholder: 'Write the chapter...',
            required: true,
          },
        ],
      },
      (values) => {
        storyChapters.push({ title: values.chapterTitle, content: values.chapterContent });
        context.ui.showToast({ text: `✅ Chapter "${values.chapterTitle}" added!` });
        context.ui.showForm(addMoreForm);
      }
    );

    const authorForm = useForm(
      {
        fields: [
          {
            type: 'string',
            name: 'author',
            label: "Author's Name",
            placeholder: 'Enter your name...',
            required: true,
          },
        ],
      },
      (values) => {
        storyAuthor = values.author;
        context.ui.showForm(chapterForm);
      }
    );

    const titleForm = useForm(
      {
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Story Title',
            placeholder: 'Enter the story title...',
            required: true,
          },
        ],
      },
      (values) => {
        storyTitle = values.title;
        context.ui.showForm(authorForm);
      }
    );

    context.ui.showForm(titleForm);
  },
});



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
