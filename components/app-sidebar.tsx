"use client";

import * as React from "react";
import {
  Archive,
  BookOpen,
  Clock,
  Files,
  FlagTriangleRight,
  Folder,
  Share2,
  Trash2,
  Upload,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation"; // Import useRouter
import { useAuthActions } from "@convex-dev/auth/react";

const data = {
  user: {
    name: "นายช่วยเหลือ วาดภาพ",
    email: "m@cooperate.com",
    avatar: "/avatars/shadcn.jpg",
  },

  projects: [
    {
      name: "เอกสารทั้งหมด",
      url: "/dashboard",
      icon: Archive,
      isActive: true,
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
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useQuery(api.myFunctions.getCurrentUser);
  const aiCategories = useQuery(api.document.getUniqueAiCategories); // Fetch unique AI categories
  const router = useRouter(); // Initialize useRouter

  // Map AI categories to the NavMain items format
  const aiCategoryNavItems = aiCategories?.map((categoryData) => ({
    title: categoryData.category,
    url: `/dashboard?category=${encodeURIComponent(categoryData.category)}`, // Link to dashboard with category param
    icon: Folder, // You can choose a relevant icon or derive it
    items: categoryData.items.map((doc) => ({
      title: doc.name,
      url: `/dashboard?documentId=${doc._id}`, // Link to document details
    })),
  })) || [];
  console.log("ai cat",aiCategories)
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <Button className="p-5"> <Upload /></Button> */}
        {/* <Image src={"/convex.svg"} alt={"logo"} width={50} height={50}/> */}
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} label="เอกสาร" />
        <NavMain items={aiCategoryNavItems} label="หมวดหมู่ AI" /> {/* Use fetched categories */}
        <NavMain items={data.mydocs} label="เอกสารของฉัน" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.name ?? data.user.name,
            email: user?.email ?? data.user.email,
            avatar: data.user.avatar, // Always use default avatar since Convex user doesn't have one
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

