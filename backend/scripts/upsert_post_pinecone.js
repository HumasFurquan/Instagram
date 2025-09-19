import mysql from "mysql2/promise";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

// init
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.index(process.env.PINECONE_INDEX);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // you’ll need this for embeddings
});

// mysql connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// fetch posts
const [posts] = await pool.query("SELECT id, content FROM posts");

console.log(`Fetched ${posts.length} posts. Starting batch upsert...`);

for (const post of posts) {
  try {
    // generate embedding from content
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: post.content || "",
    });

    // prepare vector
    const vector = {
      id: `post-${post.id}`,
      values: embedding.data[0].embedding,
      metadata: {
        content: post.content, // ✅ stored in metadata
        type: "post",
      },
    };

    // upsert
    await index.upsert([vector]);
  } catch (err) {
    console.error(`❌ Error processing post ${post.id}:`, err.message);
  }
}

console.log("🎉 All posts upserted successfully!");
process.exit();
