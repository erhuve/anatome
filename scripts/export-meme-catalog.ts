import { memeImages } from '../src/memeImages';
import { studyMemeIds } from '../src/memeCuration';

// Machine-readable input for the collector, so it never edits or parses application source.
// Include retired records so rejected material is not rediscovered as new content.
process.stdout.write(JSON.stringify(memeImages.map(meme => ({
  id: meme.id, title: meme.title, active: studyMemeIds.has(meme.id),
  image: meme.image, source: meme.source, originalImage: meme.originalImage,
}))));
