import { memes } from '../src/memes';

// Machine-readable input for the collector, so it never edits or parses application source.
process.stdout.write(JSON.stringify(memes.map(meme => ({
  id: meme.id, title: meme.title, topic: meme.lesson.topic,
  image: meme.image, source: meme.source, originalImage: meme.originalImage,
}))));
