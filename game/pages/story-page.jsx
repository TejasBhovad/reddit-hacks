import React, { useState, useEffect } from "react";
import { sendToDevvit } from "../utils";
import { useDevvitListener } from "../hooks/useDevvitListener";

const StoryPage = () => {
  const [storyData, setStoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for responses from Devvit
  const storyResponse = useDevvitListener("STORY_DATA_RESPONSE");
  const storyError = useDevvitListener("STORY_DATA_ERROR");

  // Fetch story data
  useEffect(() => {
    sendToDevvit({
      type: "FETCH_STORY_DATA",
      payload: {},
    });
  }, []);

  // Handle response
  useEffect(() => {
    if (storyResponse) {
      setStoryData(storyResponse);
      setLoading(false);
    }
  }, [storyResponse]);

  // Handle error
  useEffect(() => {
    if (storyError) {
      setError(storyError.error);
      setLoading(false);
    }
  }, [storyError]);

  if (loading) return <div className="text-white">Loading story data...</div>;
  if (error) return <div className="text-white">Error: {error}</div>;
  if (!storyData)
    return <div className="text-white">No story data available</div>;

  return (
    <div className="text-white">
      <div>{JSON.stringify(storyData.text, null, 2)}</div>
      {/* Render other story data as needed */}
    </div>
  );
};

export default StoryPage;
