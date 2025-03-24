import { Devvit, useForm, Context, JSONObject } from '@devvit/public-api';

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

export default Devvit;
