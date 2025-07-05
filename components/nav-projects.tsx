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
    isActive?: boolean; // Add isActive to the type definition
  }[];
  label: string;
}) {
  useSidebar();
  // Remove usePathname as it's no longer needed for isActive calculation here

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          // Use the isActive prop directly
          const isActive = item.isActive;

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
