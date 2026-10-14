"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { content } from "@/content/es";

const OPTIONS = [
  { value: "light", label: content.theme.light, icon: Sun },
  { value: "dark", label: content.theme.dark, icon: Moon },
  { value: "system", label: content.theme.system, icon: Monitor },
] as const;

/**
 * Light, dark or follow the system.
 *
 * The icon only renders once mounted: until then the browser's stored
 * preference is unknown to React, and rendering a guess would either flash the
 * wrong icon or trip a hydration mismatch. The button keeps its size throughout
 * so the header does not shift.
 */
/** Never notifies: "have we hydrated yet?" changes exactly once, at hydration. */
const subscribeToNothing = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Differs between server and client by design, which is precisely what
  // useSyncExternalStore's two snapshots are for.
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={content.theme.label}>
          {mounted ? <Icon className="size-4" aria-hidden="true" /> : <span className="size-4" />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            aria-current={mounted && theme === option.value ? "true" : undefined}
          >
            <option.icon className="size-4" aria-hidden="true" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
