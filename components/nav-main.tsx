"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  label,
  onMoveClick // Destructure onMoveClick
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      documentId?: string; // Add optional documentId
    }[]
    actions?: React.ReactNode; // Add optional actions prop
  }[],
  label: string,
  onMoveClick?: (documentId: string) => void; // Add optional onMoveClick prop
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, i) => (
          <Collapsible
            key={i}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {item.actions} {/* Render actions here */}
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url} className="flex justify-between items-center w-full"> {/* Adjust styling for button */}
                          <span>{subItem.title}</span>
                          {subItem.documentId && onMoveClick && ( // Render button if documentId and onMoveClick exist
                            <button
                              onClick={(e) => {
                                e.preventDefault(); // Prevent navigation
                                onMoveClick(subItem.documentId!);
                              }}
                              className="ml-2 p-1 hover:bg-gray-200 rounded" // Basic styling for button
                            >
                              <Folder size={16} /> {/* Use Folder icon */}
                            </button>
                          )}
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

import { Folder } from "lucide-react"; // Import Folder icon
