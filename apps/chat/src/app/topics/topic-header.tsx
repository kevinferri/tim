export function TopicHeader({ name }: { name: string }) {
  return (
    <div className="flex flex-col flex-1 justify-left p-2 border-b p-3">
      {name}
    </div>
  );
}
