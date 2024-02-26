export const Content = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col overflow-y-auto basis-full h-full">
      {children}
    </div>
  );
};
