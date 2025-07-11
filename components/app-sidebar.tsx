"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Archive,
  Files,
  Folder,
  FolderPlus,
  Share2,
  Trash2,
  Send,
  Users,
  Settings,
  FileText,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./ui/dialog";
import { Label } from "./ui/label";
import { NavProjects } from "./nav-projects";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const user = useQuery(api.users.getCurrentUser);
  const permissions = useQuery(api.users.getPermissionsByUserId);
  const aiCategories = useQuery(api.document.getUniqueAiCategories); // Fetch unique AI categories
  const folders = useQuery(api.folders.getFolders, {}); // Fetch folders
  const documents = useQuery(api.document.getDocumentsInAllFolders, {}); // Fetch all documents in folders
  const createFolder = useMutation(api.folders.createFolder); // Mutation to create folders

  const data = {
    user: {
      name: "นายช่วยเหลือ วาดภาพ",
      email: "m@cooperate.com",
      avatar: "/avatars/placeholder.jpg",
    },

    projects: [
      {
        name: "เอกสารทั้งหมด",
        url: "/dashboard",
        icon: Archive,
        isActive: pathname === "/dashboard" && !searchParams.get("mode") && !searchParams.get("documentId") && !searchParams.get("folderId") && !searchParams.get("category"),
      },
      {
        name: "แชร์ให้ฉัน",
        url: "/dashboard?mode=shared",
        icon: Share2,
        isActive: pathname === "/dashboard" && searchParams.get("mode") === "shared",
      },
      {
        name: "เอกสารของฉัน",
        url: "/dashboard?mode=own",
        icon: Files,
        isActive: pathname === "/dashboard" && searchParams.get("mode") === "own",
      },
      {
        name: "ถังขยะ",
        url: "/dashboard?mode=trash",
        icon: Trash2,
        isActive: pathname === "/dashboard" && searchParams.get("mode") === "trash",
      },
    ],
  };
  const [newFolderName, setNewFolderName] = useState("");
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder({ name: newFolderName });
      setNewFolderName("");
      setIsNewFolderDialogOpen(false);
    }
  };

  const hasPermission = (p: string) => permissions?.includes(p);

  // Organize documents under folders
  const folderItems = folders?.map(folder => {
    const nestedDocuments = documents?.filter(doc => doc.folderId === folder._id).map(doc => ({
      title: doc.name,
      url: `/dashboard?documentId=${doc._id}`,
      documentId: doc._id, // Add documentId
    })) || [];
    return {
      title: folder.name,
      url: `/dashboard?folderId=${folder._id}`,
      icon: Folder,
      items: nestedDocuments,
    };
  }) || [];


  // Map AI categories to the NavMain items format
  const aiCategoryNavItems = aiCategories?.map((categoryData) => ({
    title: categoryData.category,
    url: `/dashboard?category=${encodeURIComponent(categoryData.category)}`, // Link to dashboard with category param
    icon: Folder, // You can choose a relevant icon or derive it
    items: categoryData.items.map((doc) => ({
      title: doc.name,
      url: `/dashboard?documentId=${doc._id}`, // Link to document details
      documentId: doc._id, // Add documentId
    })),
  })) || [];

  const adminNavItems = [
    {
      name: "ส่งเอกสารเหมารวมแผนก",
      url: "/send-across-dep",
      icon: Send,
      hidden: !(hasPermission("document:send:department") || hasPermission("document:send:company")),
    },
    {
      name: "ส่งเอกสารแบบเหมารวม",
      url: "/send-across-org",
      icon: Send,
      hidden: !hasPermission("document:send:company"),
    },
    {
      name: "จัดการผู้ใช้",
      url: "/manage-user",
      icon: Users,
      hidden: !hasPermission("user:update:any"),
    },
    {
      name: "ดูเหตุการณ์ของระบบ",
      url: "/view-syslog",
      icon: FileText,
      hidden: !hasPermission("system:logs:read"),
    },
    {
      name: "ตั้งค่าระบบ",
      url: "/sys-control",
      icon: Settings,
      hidden: !(hasPermission("system:settings:read") || hasPermission("system:settings:update")),
    },
  ].filter(item => !item.hidden);


  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <Button className="p-5"> <Upload /></Button> */}
        {/* <Image src={"/convex.svg"} alt={"logo"} width={50} height={50}/> */}
      </SidebarHeader>
      <SidebarContent>
        {/* <NavMain items={topLevelItems} label="เอกสาร" /> */}
        <NavProjects projects={data.projects} label={"ทั่วไป"} />
        <NavMain items={aiCategoryNavItems} label="หมวดหมู่ AI" />
        <NavMain items={folderItems} label="โฟลเดอร์" />
        {adminNavItems.length > 0 && <NavProjects projects={adminNavItems} label="อื่น ๆ" />}
        
        <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="m-4"><FolderPlus /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>สร้างโฟลเดอร์ใหม่</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="folderName" className="text-right">
                  ชื่อโฟลเดอร์
                </Label>
                <Input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">ยกเลิก</Button>
              </DialogClose>
              <Button onClick={handleCreateFolder}>สร้าง</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

