"use client";

import { Badge } from "@/components/ui/badge";

type Props = {
  date: Date;
};

function isToday(date: Date): boolean {
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function formatDate(date: Date): string {
  const month = date.toLocaleString("default", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function MessageDateSeparator({ date }: Props) {
  const dateText = () => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return formatDate(date);
  };

  return (
    <div className="flex items-center py-3">
      <div className="flex-1 h-px bg-border" />
      <Badge variant="outline" className="flex-shrink-0 px-3 py-1">
        {dateText()}
      </Badge>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
