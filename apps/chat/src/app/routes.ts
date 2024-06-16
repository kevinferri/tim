export enum Routes {
  // App
  Home = "/",
  TopicsForCircle = "/circles/:id",
  Topic = "/topics/:id",

  // Statics
  SignIn = "/signin",
  Terms = "/terms",
  Privacy = "/privacy",
}

export function getLinkForTopic(id: string) {
  return Routes.Topic.replace(":id", id);
}
