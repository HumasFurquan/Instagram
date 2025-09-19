import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('Set PINECONE_API_KEY in .env');
    process.exit(1);
  }

  const pc = new Pinecone({ apiKey });

  const indexName = process.env.PINECONE_INDEX || 'instagram-posts';

  try {
    // ✅ get the indexes array
    const existing = await pc.listIndexes();
    const indexesArray = existing.indexes || []; 

    if (indexesArray.includes(indexName)) {
      console.log(`Index already exists: ${indexName}`);
      return;
    }

    console.log(`Creating index: ${indexName} ...`);

    await pc.createIndexForModel({
      name: indexName,
      cloud: 'aws',
      region: 'us-east-1',
      embed: {
        model: 'llama-text-embed-v2',
        fieldMap: { text: 'chunk_text' }
      },
      waitUntilReady: true
    });

    console.log(`Index ${indexName} created and ready.`);

  } catch (err) {
    console.error('Error creating index:', err);
    process.exit(1);
  }
}

main();
