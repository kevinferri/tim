"use client";

import { CommandInfo } from "@tim/commands";
import { cn } from "@/lib/utils";
import { CommandIcon } from "@/components/topics/command-icon";

type Props = {
  commands: CommandInfo[];
  selectedIndex: number;
  onSelect: (command: CommandInfo) => void;
  onHover: (index: number) => void;
};

export function CommandAutocomplete({
  commands,
  selectedIndex,
  onSelect,
  onHover,
}: Props) {
  return (
    <div
      role="listbox"
      className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {commands.map((command, index) => {
        const [primaryToken, ...aliases] = command.tokens;
        const isSelected = index === selectedIndex;

        return (
          <div
            key={command.name}
            role="option"
            aria-selected={isSelected}
            // mousedown (not click) fires before the textarea blurs, so
            // selection still lands while the input keeps focus
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(command);
            }}
            onMouseEnter={() => onHover(index)}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm",
              isSelected ? "bg-accent text-accent-foreground" : ""
            )}
          >
            <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <CommandIcon name={command.name} className="h-4 w-4" />
              <span className="text-base font-pronounced">/{primaryToken}</span>
              {aliases.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  (or /{aliases.join(", /")})
                </span>
              )}
            </div>
            <div className="hidden min-w-0 items-baseline gap-2 truncate sm:flex">
              <span className="text-xs text-muted-foreground">
                {command.description}
              </span>
              <span className="text-xs text-muted-foreground/50">|</span>
              <span className="truncate font-mono text-xs text-muted-foreground/70">
                {command.usage}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
