import { isLocalDev } from "./is-local-dev";

// Stands in for a real Giphy lookup when GIPHY_KEY isn't set locally -- a real,
// permanent Giphy CDN URL so the message renders exactly like a live result.
const LOCAL_DEV_GIF_URL =
  "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif";

// Stands in for a real YouTube search when YOUTUBE_KEY isn't set locally.
const LOCAL_DEV_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

export async function getRandomGif(query: string) {
  if (isLocalDev() && !process.env.GIPHY_KEY) return LOCAL_DEV_GIF_URL;

  const endpoint = `http://api.giphy.com/v1/gifs/random/?key=${process.env.GIPHY_KEY}&tag=${query}`;
  const resp = await fetch(endpoint);
  if (!resp.ok) return undefined;
  const json = await resp.json();
  if (!json.data || json.data.length === 0) return undefined;

  return `${json.data.images.original.url}`;
}

export async function getYoutubeVideo(query: string) {
  if (isLocalDev() && !process.env.YOUTUBE_KEY) return LOCAL_DEV_YOUTUBE_URL;

  const endpoint = `https://www.googleapis.com/youtube/v3/search?key=${process.env.YOUTUBE_KEY}&q=${query}&type=video&part=id&maxResults=1`;
  const resp = await fetch(endpoint);
  if (!resp.ok) return undefined;
  const json = await resp.json();
  if (!json || !json.items || json.items.length === 0) return undefined;

  return `https://www.youtube.com/watch?v=${json.items[0].id.videoId}`;
}
