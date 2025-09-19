// backend/utils/tags.js
export function extractTagsAndMentions(content = "") {
  // simple but robust regex - allow alphanumeric and underscore in names
  const hashtagRe = /#([A-Za-z0-9_]+)/g;
  const mentionRe = /@([A-Za-z0-9_]+)/g;

  const hashtags = new Set();
  const mentions = new Set();

  let m;
  while ((m = hashtagRe.exec(content)) !== null) {
    hashtags.add(m[1]); // store without '#'
  }
  while ((m = mentionRe.exec(content)) !== null) {
    mentions.add(m[1]); // store without '@'
  }

  return {
    hashtags: Array.from(hashtags),
    mentions: Array.from(mentions)
  };
}
