export function TopicHeader({ name }: { name: string }) {
  return (
    <div className="flex flex-1 justify-left bg-secondary p-2 border-b">
      {name}
    </div>
  );
}
