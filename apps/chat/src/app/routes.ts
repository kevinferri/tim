export enum Routes {
  // App
  Home = "/",
  TopicsForCircle = "/circles/:id",
  Topic = "/topics/:id",
  SignIn = "/signin",
  Terms = "/static/terms",
  Privacy = "/static/privacy",
}

const generateTopicHash = () =>
  btoa(Math.random().toString()).substring(10, 15);

export function getLinkForTopic(id: string) {
  return `${Routes.Topic.replace(":id", id)}?t=${generateTopicHash()}`;
}
