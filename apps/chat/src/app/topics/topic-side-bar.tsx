import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellIcon, ImageIcon, StarIcon } from "@radix-ui/react-icons";
import { TopHighlights } from "./top-highlights";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TopicSideBar() {
  return (
    <div className="flex flex-col shadow-md border-l max-w-[340px] min-w-[340px] basis-full h-full overflow-hidden">
      <Tabs defaultValue="highlights" className="h-full">
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

        <ScrollArea className="h-full">
          <TabsContent value="highlights">
            <TopHighlights />
          </TabsContent>
        </ScrollArea>

        <TabsContent value="media">Media</TabsContent>
        <TabsContent value="notifications">Notifications</TabsContent>
      </Tabs>
    </div>
  );
}
