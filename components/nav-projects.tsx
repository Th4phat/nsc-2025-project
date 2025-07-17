"use client";

import { type LucideIcon } from "lucide-react";
import clsx from "clsx";

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
    isActive?: boolean;
  }[];
  label: string;
}) {
  useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => {
          const isActive = item.isActive;

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <a
                  href={item.url}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                    isActive
                      ?
                      "font-semibold text-blue-700 bg-blue-100"
                      :
                      "font-medium",
                  )}
                >
                  <item.icon className="w-4 h-4" />
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
