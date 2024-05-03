import {
  BellIcon,
  ImageIcon,
  PersonIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopHighlights } from "@/topics/top-highlights";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TopicSideBar() {
  return (
    <div className="flex flex-col shadow-md border-l max-w-[380px] min-w-[380px] basis-full h-full overflow-hidden">
      <Tabs defaultValue="highlights" className="h-full">
        <div className="p-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="highlights">
              <StarIcon />
            </TabsTrigger>

            <TabsTrigger value="media">
              <ImageIcon />
            </TabsTrigger>

            <TabsTrigger value="members">
              <PersonIcon />
            </TabsTrigger>

            <TabsTrigger value="notifications">
              <BellIcon />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="highlights" className="h-full">
          <div className="text-center pb-3">Top highlights</div>
          <ScrollArea className="h-full">
            <TopHighlights />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="media" className="h-full">
          <div className="text-center pb-3">Media</div>
          <ScrollArea className="h-full">Media here</ScrollArea>
        </TabsContent>

        <TabsContent value="members" className="h-full">
          <div className="text-center pb-3">Circle members</div>
          <ScrollArea className="h-full">Circle members here</ScrollArea>
        </TabsContent>

        <TabsContent value="notifications" className="h-full">
          <div className="text-center pb-3">Notifications</div>
          <ScrollArea className="h-full">Notifications here</ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
