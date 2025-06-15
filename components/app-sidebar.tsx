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
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation"; // Import useRouter
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./ui/dialog";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"; // Import RadioGroup components

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
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useQuery(api.users.getCurrentUser);
  const aiCategories = useQuery(api.document.getUniqueAiCategories); // Fetch unique AI categories
  const folders = useQuery(api.folders.getFolders); // Fetch folders
  const documents = useQuery(api.folders.getDocuments, {}); // Fetch all documents
  const createFolder = useMutation(api.folders.createFolder); // Mutation to create folders
  const router = useRouter(); // Initialize useRouter

  const [newFolderName, setNewFolderName] = useState("");
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isMoveDocumentDialogOpen, setIsMoveDocumentDialogOpen] = useState(false); // State for move document modal
  const [documentToMoveId, setDocumentToMoveId] = useState<string | null>(null); // State for document being moved
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // State for selected folder

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder({ name: newFolderName });
      setNewFolderName("");
      setIsNewFolderDialogOpen(false);
    }
  };

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

  const topLevelDocuments = documents?.filter(doc => !doc.folderId).map(doc => ({
    title: doc.name,
    url: `/dashboard?documentId=${doc._id}`,
    documentId: doc._id, // Add documentId
  })) || [];

  const topLevelItems = [
    {
      title: "เอกสารทั้งหมด",
      url: "/dashboard",
      icon: Archive,
      isActive: true,
    },
    ...topLevelDocuments.map(doc => ({
      title: doc.title,
      url: doc.url,
      icon: BookOpen, // Or another suitable icon for documents
      documentId: doc.documentId, // Add documentId
    }))
  ];

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

  const folderNavItems = folders?.map((folder) => ({
    title: folder.name,
    url: `/dashboard?folderId=${folder._id}`,
    icon: Folder,
    items: [], // Sub-folders can be populated here in the future
  })) || [];

  const moveDocument = useMutation(api.folders.moveDocumentToFolder); // Mutation to move documents

  const handleMoveDocument = async () => {
    if (documentToMoveId && selectedFolderId) {
      await moveDocument({ documentId: documentToMoveId as any, folderId: selectedFolderId as any });
      setIsMoveDocumentDialogOpen(false);
      setDocumentToMoveId(null);
      setSelectedFolderId(null);
    }
  };


  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <Button className="p-5"> <Upload /></Button> */}
        {/* <Image src={"/convex.svg"} alt={"logo"} width={50} height={50}/> */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={topLevelItems} label="เอกสาร" onMoveClick={(documentId) => { // Add onMoveClick
          setDocumentToMoveId(documentId);
          setIsMoveDocumentDialogOpen(true);
        }} />
        <NavMain items={aiCategoryNavItems} label="หมวดหมู่ AI" onMoveClick={(documentId) => { // Add onMoveClick
          setDocumentToMoveId(documentId);
          setIsMoveDocumentDialogOpen(true);
        }} /> {/* Use fetched categories */}
        <NavMain items={folderItems} label="โฟลเดอร์" onMoveClick={(documentId) => { // Add onMoveClick
          setDocumentToMoveId(documentId);
          setIsMoveDocumentDialogOpen(true);
        }} />

        <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full mt-4">New Folder</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="folderName" className="text-right">
                  Folder Name
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
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateFolder}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Move Document Modal */}
        <Dialog open={isMoveDocumentDialogOpen} onOpenChange={setIsMoveDocumentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move Document</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label>Select a folder:</Label>
              <RadioGroup onValueChange={setSelectedFolderId}>
                {folders?.map(folder => (
                  <div key={folder._id} className="flex items-center space-x-2">
                    <RadioGroupItem value={folder._id} id={folder._id} />
                    <Label htmlFor={folder._id}>{folder.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleMoveDocument} disabled={!selectedFolderId}>Move</Button>
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

