import { TopicsNav } from "@/components/topics/topics-nav";

type Props = {
  children: React.ReactNode;
  params: {
    circleId: string;
  };
};

export default async function CircleLayout(props: Props) {
  const params = await props.params;

  return (
    <>
      <TopicsNav circleId={params.circleId} />
      {props.children}
    </>
  );
}
