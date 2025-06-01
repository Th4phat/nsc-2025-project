"use client";

import * as React from "react";
import {
  Archive,
  AudioWaveform,
  BookOpen,
  Bot,
  Clock,
  Command,
  Files,
  FlagTriangleRight,
  Folder,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  Share2,
  SquareTerminal,
  Trash2,
  Upload,
  WalletCards,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";

// This is sample data.
const data = {
  user: {
    name: "นายช่วยเหลือ วาดภาพ",
    email: "m@cooperate.com",
    avatar: "/avatars/shadcn.jpg",
  },

  navMain: [
    {
      title: "รายงาน",
      url: "#",
      icon: FlagTriangleRight,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "ใบแจ้งหนี้",
      url: "#",
      icon: WalletCards,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "สัญญาค้าขาย",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "เอกสารทั้งหมด",
      url: "/dashboard",
      icon: Archive ,
      isActive: true
    },
    {
      name: "เพิ่มล่าสุด",
      url: "#",
      icon: Clock,
    },
    {
      name: "แชร์ให้แล้ว",
      url: "/share",
      icon: Share2,
    },
    {
      name: "เอกสารฉัน",
      url: "#",
      icon: Files,
    },
    {
      name: "ถังขยะ",
      url: "#",
      icon: Trash2,
    },
  ],
  mydocs: [
    {
      title: "เอกสารสำคัญ",
      url: "#",
      icon: Folder,
      items: [
        {
          title: "รายจ่ายบริษัท 2024",
          url: "#",
        },
        {
          title: "ใบแจ้งหนี้บริษัท 2025",
          url: "#",
        },
        {
          title: "Q1 รายได้สุทธิ",
          url: "#",
        },
      ],
    },
  ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Button className="p-5"> <Upload />อัพโหลดเอกสาร</Button>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} label="เอกสาร" />
        <NavMain items={data.navMain} label="หมวดหมู่ AI" />
        <NavMain items={data.mydocs} label="เอกสารของฉัน" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

