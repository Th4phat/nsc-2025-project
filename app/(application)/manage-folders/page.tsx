"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";

export default function ManageFoldersPage() {
  const folders = useQuery(api.folders.getFolders, {});
  const createFolder = useMutation(api.folders.createFolder);
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const renameFolder = useMutation(api.folders.renameFolder);

  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const handleCreateFolder = async () => {
    if (newFolderName.trim() === "") return;
    await createFolder({ name: newFolderName });
    setNewFolderName("");
  };

  const handleDeleteFolder = async (folderId: Doc<"folders">["_id"]) => {
    if (confirm("Are you sure you want to delete this folder?")) {
      await deleteFolder({ folderId });
    }
  };

  const handleRenameFolder = async (folderId: Doc<"folders">["_id"]) => {
    if (editingFolderName.trim() === "") return;
    await renameFolder({ folderId, newName: editingFolderName });
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const aiCategories = useQuery(api.document_crud.getAllAiCategories, {});
  const renameAiCategory = useMutation(api.document_crud.renameAiCategory);
  const deleteAiCategory = useMutation(api.document_crud.deleteAiCategory);

  const [editingAiCategory, setEditingAiCategory] = useState<string | null>(null);
  const [editingAiCategoryName, setEditingAiCategoryName] = useState("");

  const handleRenameAiCategory = async (oldName: string) => {
    if (editingAiCategoryName.trim() === "") return;
    await renameAiCategory({ oldCategoryName: oldName, newCategoryName: editingAiCategoryName });
    setEditingAiCategory(null);
    setEditingAiCategoryName("");
  };

  const handleDeleteAiCategory = async (categoryName: string) => {
    if (confirm(`Are you sure you want to delete the AI category "${categoryName}" from all documents?`)) {
      await deleteAiCategory({ categoryName });
    }
  };

  return (
    <div className="container">
      <header className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-10 h-16 shrink-0 items-center gap-2 px-4 border-b mb-8">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-6" />
          </header>
        <div className="mx-6">
      <h1 className="text-3xl font-bold mb-6">จัดการโฟลเดอร์และหมวดหมู่ AI</h1>

      <Tabs defaultValue="user-folders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="user-folders">โฟลเดอร์ผู้ใช้</TabsTrigger>
          <TabsTrigger value="ai-categories">หมวดหมู่ AI</TabsTrigger>
        </TabsList>

        <TabsContent value="user-folders" className="mt-6">
          <div className="mb-6 flex gap-2">
            <Input
              placeholder="ชื่อโฟลเดอร์ใหม่"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
            <Button onClick={handleCreateFolder}>
              <PlusCircle className="mr-2 h-4 w-4" /> สร้างโฟลเดอร์
            </Button>
          </div>

          {folders === undefined ? (
            <div>Loading folders...</div>
          ) : (
            <div>
              {folders.length === 0 ? (
                <p>ไม่พบโฟลเดอร์ผู้ใช้ สร้างโฟลเดอร์แรกของคุณ!</p>
              ) : (
                <ul>
                  {folders.map((folder: Doc<"folders">) => (
                    <li key={folder._id} className="flex items-center justify-between py-2 border-b">
                      {editingFolderId === folder._id ? (
                        <div className="flex-1 flex gap-2 items-center">
                          <Input
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleRenameFolder(folder._id);
                              }
                            }}
                          />
                          <Button onClick={() => handleRenameFolder(folder._id)}>บันทึก</Button>
                          <Button variant="ghost" onClick={() => setEditingFolderId(null)}>ยกเลิก</Button>
                        </div>
                      ) : (
                        <span className="flex-1">{folder.name}</span>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingFolderId(folder._id);
                            setEditingFolderName(folder.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFolder(folder._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai-categories" className="mt-6">
          {aiCategories === undefined ? (
            <div>Loading AI categories...</div>
          ) : (
            <div>
              {aiCategories.length === 0 ? (
                <p>ไม่พบหมวดหมู่ AI</p>
              ) : (
                <ul>
                  {aiCategories.map((category: string) => (
                    <li key={category} className="flex items-center justify-between py-2 border-b">
                      {editingAiCategory === category ? (
                        <div className="flex-1 flex gap-2 items-center">
                          <Input
                            value={editingAiCategoryName}
                            onChange={(e) => setEditingAiCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRenameAiCategory(category);
                              }
                            }}
                          />
                          <Button onClick={() => handleRenameAiCategory(category)}>บันทึก</Button>
                          <Button variant="ghost" onClick={() => setEditingAiCategory(null)}>ยกเลิก</Button>
                        </div>
                      ) : (
                        <span className="flex-1">{category}</span>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingAiCategory(category);
                            setEditingAiCategoryName(category);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAiCategory(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}