import React, { useState, useEffect } from "react";
import { sendToDevvit } from "../utils";
import { useDevvitListener } from "../hooks/useDevvitListener";

const CommentPage = () => {
  const [commentState, setCommentState] = useState({ comments: [] });
  const [loading, setLoading] = useState(false);
  const comments = useDevvitListener("TOP_COMMENTS_RESPONSE");

  const fetchComments = () => {
    setLoading(true);
    sendToDevvit({
      type: "GET_TOP_COMMENTS",
      payload: {},
    });
  };

  useEffect(() => {
    fetchComments();
  }, []);

  useEffect(() => {
    if (comments) {
      setCommentState(comments);
      setLoading(false);
    }
  }, [comments]);

  return (
    <div className="text-white">
      {loading ? (
        <div>Loading comments...</div>
      ) : (
        <pre>{JSON.stringify(commentState, null, 2)}</pre>
      )}
    </div>
  );
};

export default CommentPage;
