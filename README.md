# React + Tailwind Webview Template for Devvit

This is a template for creating a Devvit webview app using React and Tailwind CSS. This repo is highly based off of [devvit-webview-react](https://github.com/mwood23/devvit-webview-react) repository.
This repo focusses of eliminating typescript(where possible) and making the template more beginner friendly.

> Yes there is typescript in the files, but devvit requires typescript as entry point.

## Getting Started

### Prerequisites

- Node.js
- npm or yarn or pnpm
- Git
- Devvit CLI (login required)

1.  Install the Devvit CLI by running `npm install -g @devvit/cli` or `yarn global add @devvit/cli` or `pnpm add -g @devvit/cli`
2.  Login to your Devvit account by running `devvit login`
3.  Upload your app by running `devvit upload` in the root directory of your app

### Installation

1. Clone this repository
2. Run `npm install` or `yarn install` or `pnpm install`
3. modify the `devvit.yaml` file to match your app name also update `package.json` with your subreddit name
4. Run `npm run dev` or `yarn dev` or `pnpm dev` to start the development server with HMR on reddit

# How the game is structured

`src` folder acts as the entry point for the game.\
`src/backend` folder contains the API calls and the backend logic.\
`src/constants.js` contains the secrets used in the game.\
`src/main.tsx` is the entry point for the game. It is where everything devvit related is configured(custom post types, custom menus, etc).\
`game` folder contains the game logic and the game components.\
`game/components` folder contains the game components.\
`game/hooks` folder contains the game hooks like navigation hooks, etc.\
`game/pages` folder contains the game pages.\
`games/public` folder contains the public assets like images, etc.\
`games/App.jsx` is the entry point for the game. It is where the game is structured.\
`games/shared.ts` contains the shared types and interfaces used in the game. Basically the types for Devvit Functions.\

# Other references that might be useful

- [Scheduler function](https://developers.reddit.com/docs/capabilities/scheduler)
