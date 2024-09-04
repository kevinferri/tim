export async function getRandomGif(query: string) {
  const endpoint = `http://api.giphy.com/v1/gifs/random/?key=${process.env.GIPHY_KEY}&tag=${query}`;
  const resp = await fetch(endpoint);
  if (!resp.ok) return undefined;
  const json = await resp.json();

  // fallback when no gif is found
  if (!json.data || json.data.length === 0) {
    return "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDN4cnBldTRmb3I4ZHNxMmM3bTJxbGwycG81c2MzZHhqcm90aTJucCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YJBNjrvG5Ctmo/giphy.gif";
  }

  return json.data.images.original.url;
}

export async function getYoutubeVideo(query: string) {
  const endpoint = `https://www.googleapis.com/youtube/v3/search?key=${process.env.YOUTUBE_KEY}&q=${query}&type=video&part=id&maxResults=1`;
  const resp = await fetch(endpoint);
  if (!resp.ok) return undefined;
  const json = await resp.json();
  if (!json || !json.items || json.items.length === 0) return undefined;

  return `https://www.youtube.com/watch?v=${json.items[0].id.videoId}`;
}
