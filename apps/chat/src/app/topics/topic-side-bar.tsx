import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellIcon, ImageIcon, StarIcon } from "@radix-ui/react-icons";
import { TopHighlights } from "./top-highlights";

export async function TopicSideBar() {
  return (
    <div className="flex flex-col shadow-md border-l max-w-[320px] min-w-[320px] p-3">
      <Tabs defaultValue="highlights">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="highlights">
            <StarIcon />
          </TabsTrigger>
          <TabsTrigger value="media">
            <ImageIcon />
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <BellIcon />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="highlights">
          <TopHighlights />
        </TabsContent>
        <TabsContent value="media">Media</TabsContent>
        <TabsContent value="notifications">Notifications</TabsContent>
      </Tabs>
    </div>
  );
}
