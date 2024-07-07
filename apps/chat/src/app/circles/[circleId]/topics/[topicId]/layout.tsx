import { Content } from "@/components/layouts/dashboard/content";
import { TopicsNav } from "@/topics/topics-nav";

type Props = {
  children: React.ReactNode;
  params: {
    topicId: string;
    circleId: string;
  };
};

export default function TopicLayout(props: Props) {
  return (
    <>
      <TopicsNav
        topicId={props.params.topicId}
        circleId={props.params.circleId}
      />
      <Content>{props.children}</Content>
    </>
  );
}
