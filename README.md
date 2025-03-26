# PlotPick Game

Community driven [Devvit](https://developers.reddit.com) game where users can pick the plot of the game.

![Preview Image](./github/preview.png)

🌐 Live Demo: https://www.reddit.com/r/PlotPickGame/comments/1jk2prj/starry_night

Each post starts with an inital story and users can comment on the post with their ideas for the next part of the story. The most upvoted comment is used to generate the next part of the story using Gemini Flash Models, an image is also generated based on this.

## LLMs used

- gemini-2.0-flash: for generating the next part of the story
- gemini-2.0-flash-exp-image-generation: for generating the image based on the story

NOTE: We are on the free plan of Gemini Flash Models so there can be significant downtime in case of exhausted credits.

> Yes there is typescript and javascript both in the files, cause I dislike typescript(mostly cause dont use it extensively) but devvit requires typescript as entry point.

This repository was based on [github.com/TejasBhovad/devvit-template](https://github.com/TejasBhovad/devvit-template)

Upvote the post on DevPost [here](https://developers.reddit.com/post/plotpick-game)
