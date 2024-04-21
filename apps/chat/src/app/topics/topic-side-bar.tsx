import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellIcon, ImageIcon, StarIcon } from "@radix-ui/react-icons";
import { TopHighlights } from "./top-highlights";

export function TopicSideBar() {
  return (
    <div className="flex flex-col shadow-md border-l max-w-[320px] min-w-[320px]">
      <Tabs defaultValue="highlights">
        <div className="p-3">
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
        </div>
        <TabsContent value="highlights">
          <TopHighlights />
        </TabsContent>
        <TabsContent value="media">Media</TabsContent>
        <TabsContent value="notifications">Notifications</TabsContent>
      </Tabs>
    </div>
  );
}
