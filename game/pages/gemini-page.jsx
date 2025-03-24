import React, { useState } from "react";
import { sendToDevvit } from "../utils";
import { useDevvitListener } from "../hooks/useDevvitListener";

const GeminiTestPage = () => {
  // Story generation states
  const [storyPrompt, setStoryPrompt] = useState("");
  const [chapterCount, setChapterCount] = useState(5);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [generatedStory, setGeneratedStory] = useState("");
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState(null);

  // Image generation states
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(null);

  // Listen for responses from Devvit
  const storyResponse = useDevvitListener("GENERATE_STORY_RESPONSE");
  const imageResponse = useDevvitListener("GENERATE_IMAGE_RESPONSE");

  // Handler for story generation
  const handleGenerateStory = () => {
    setStoryLoading(true);
    setStoryError(null);

    sendToDevvit({
      type: "GENERATE_STORY_REQUEST",
      payload: {
        prompt: storyPrompt,
        chapterCount: parseInt(chapterCount),
        currentChapter: parseInt(currentChapter),
      },
    });
  };

  // Handler for image generation
  const handleGenerateImage = () => {
    setImageLoading(true);
    setImageError(null);

    sendToDevvit({
      type: "GENERATE_IMAGE_REQUEST",
      payload: {
        prompt: imagePrompt,
      },
    });
  };

  // Process responses
  React.useEffect(() => {
    if (storyResponse) {
      setStoryLoading(false);

      setGeneratedStory(storyResponse.text);
    }
    // console.log(storyResponse);
  }, [storyResponse]);

  React.useEffect(() => {
    if (imageResponse) {
      setImageLoading(false);

      if (imageResponse.success) {
        setGeneratedImages(imageResponse.payload.images);
      } else {
        setImageError(imageResponse.message || "Failed to generate image");
      }
    }
  }, [imageResponse]);

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <h1 className="mb-6 text-2xl font-bold text-white">Gemini API Test</h1>

      {/* Story Generation Section */}
      <section className="mb-8 rounded-lg bg-gray-800 p-4">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Story Generation
        </h2>

        <div className="mb-4">
          <label className="mb-2 block text-white">Story Prompt:</label>
          <textarea
            className="w-full rounded bg-gray-700 p-2 text-white"
            rows="3"
            value={storyPrompt}
            onChange={(e) => setStoryPrompt(e.target.value)}
            placeholder="Enter a prompt for your story..."
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-white">Chapter Count:</label>
            <input
              type="number"
              className="w-full rounded bg-gray-700 p-2 text-white"
              value={chapterCount}
              onChange={(e) => setChapterCount(e.target.value)}
              min="1"
            />
          </div>

          <div>
            <label className="mb-2 block text-white">Current Chapter:</label>
            <input
              type="number"
              className="w-full rounded bg-gray-700 p-2 text-white"
              value={currentChapter}
              onChange={(e) => setCurrentChapter(e.target.value)}
              min="1"
              max={chapterCount}
            />
          </div>
        </div>

        <button
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-500"
          onClick={handleGenerateStory}
          disabled={storyLoading || !storyPrompt}
        >
          {storyLoading ? "Generating..." : "Generate Story"}
        </button>

        {storyError && (
          <div className="mt-4 rounded bg-red-900 p-3 text-white">
            Error: {storyError}
          </div>
        )}

        {generatedStory && (
          <div className="mt-4">
            <h3 className="mb-2 font-semibold text-white">Generated Story:</h3>
            <div className="rounded bg-gray-700 p-3 whitespace-pre-wrap text-white">
              {JSON.stringify(generatedStory)}
            </div>
          </div>
        )}
      </section>

      {/* Image Generation Section */}
      <section className="mb-8 rounded-lg bg-gray-800 p-4">
        <h2 className="mb-4 text-xl font-semibold text-white">
          Image Generation
        </h2>

        <div className="mb-4">
          <label className="mb-2 block text-white">Image Prompt:</label>
          <textarea
            className="w-full rounded bg-gray-700 p-2 text-white"
            rows="3"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
          />
        </div>

        <button
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-500"
          onClick={handleGenerateImage}
          disabled={imageLoading || !imagePrompt}
        >
          {imageLoading ? "Generating..." : "Generate Image"}
        </button>

        {imageError && (
          <div className="mt-4 rounded bg-red-900 p-3 text-white">
            Error: {imageError}
          </div>
        )}

        {generatedImages.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 font-semibold text-white">Generated Images:</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {generatedImages.map((image, index) => (
                <div key={index} className="rounded bg-gray-700 p-2">
                  <img
                    src={image}
                    alt={`Generated image ${index + 1}`}
                    className="h-auto w-full rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default GeminiTestPage;
