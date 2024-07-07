import { TopicsNav } from "@/components/topics/topics-nav";

type Props = {
  children: React.ReactNode;
  params: {
    circleId: string;
  };
};

export default function CircleLayout(props: Props) {
  return (
    <>
      <TopicsNav circleId={props.params.circleId} />
      {props.children}
    </>
  );
}
