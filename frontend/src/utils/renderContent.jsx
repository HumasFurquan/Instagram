// src/utils/renderContent.js
import React from 'react';

export function renderContentWithLinks(content) {
  if (!content || typeof content !== "string") {
    return null; // or return <></> if you prefer an empty span
  }

  // split on #tag or @name tokens, keep delimiters
  const parts = content.split(/(\#[A-Za-z0-9_]+|@[A-Za-z0-9_]+)/g);

  return parts.map((part, i) => {
    if (!part) return null;

    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return (
        <a
          key={i}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          onClick={(e) => {
            e.preventDefault();
            // route to hashtag page or handle via React Router
          }}
          style={{ color: "blue" }}
        >
          {part}
        </a>
      );
    }

    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <a
          key={i}
          href={`/user/${encodeURIComponent(username)}`}
          onClick={(e) => {
            e.preventDefault();
            // route to user profile
          }}
          style={{ color: "green" }}
        >
          {part}
        </a>
      );
    }

    return <span key={i}>{part}</span>;
  });
}
