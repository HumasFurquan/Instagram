// src/utils/renderContent.js
import React from 'react';

export function renderContentWithLinks(content) {
  // split on #tag or @name tokens, keep delimiters
  const parts = content.split(/(\#[A-Za-z0-9_]+|@[A-Za-z0-9_]+)/g);

  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return <a key={i} href={`/hashtag/${encodeURIComponent(tag)}`} onClick={(e)=>{e.preventDefault(); /* route or call API */}}>{part}</a>;
    }
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return <a key={i} href={`/user/${encodeURIComponent(username)}`} onClick={(e)=>{e.preventDefault(); /* route or call API */}}>{part}</a>;
    }
    return <span key={i}>{part}</span>;
  });
}
