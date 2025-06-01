"use client";

import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation"; // Import usePathname
import clsx from "clsx"; // Import clsx for easily combining class names

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavProjects({
  projects,
  label,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
  label: string;
}) {
  useSidebar();
  const pathname = usePathname(); // Get the current pathname

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          // Check if the item's URL matches the current pathname
          const isActive = pathname === item.url;

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <a
                  href={item.url}
                  // Use clsx to conditionally apply classes
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                    isActive
                      ? // Active state classes (similar to your layout example)
                        "font-semibold text-blue-700 bg-blue-100"
                      : // Default state classes
                        "font-medium",
                  )}
                >
                  <item.icon className="w-4 h-4" /> {/* Added size for icons */}
                  <span>{item.name}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
