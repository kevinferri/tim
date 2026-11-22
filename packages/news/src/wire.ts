/** A news item as sent to browsers, over Socket.IO and from the chat app's news API alike. */
export type NewsItemDto = {
  id: string;
  feedId: string;
  title: string;
  link: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: string;
  createdAt: string;
};

/** SocketEvent.NewsItemsCreated payload, sent to each following circle's room. */
export type NewsItemsCreatedPayload = {
  circleId: string;
  items: NewsItemDto[];
};

export function toNewsItemDto(item: {
  id: string;
  feedId: string;
  title: string;
  link: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: Date;
  createdAt: Date;
}): NewsItemDto {
  return {
    id: item.id,
    feedId: item.feedId,
    title: item.title,
    link: item.link,
    summary: item.summary,
    imageUrl: item.imageUrl,
    publishedAt: item.publishedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
  };
}
