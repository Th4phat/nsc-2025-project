"use client"
import React, { useState, Component, ErrorInfo, ReactNode } from "react";
import { ShareModal } from "@/components/ShareModal";
import { DocModal } from "@/components/DocumentModal";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import { formatRelative } from "date-fns";
import PDFViewer from "react-pdf-view"
import {
  Download,
  Share,
  Edit3,
  FolderOpen,
  Trash2,
  Calendar,
  HardDrive,
  FileType,
  Tag,
  FileQuestion,
  MoreHorizontal,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./ui/dialog";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";


// Enhanced Download Button Component
interface DownloadButtonSectionProps {
  document: Doc<"documents">;
}
const DownloadButtonSection: React.FC<DownloadButtonSectionProps> = ({ document }) => {
  const generateDownloadUrl = useQuery(api.document.generateDownloadUrl, { documentId: document._id });

  const handleDownload = async () => {
    if (generateDownloadUrl && document) {
      const a = window.document.createElement("a");
      a.href = generateDownloadUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    }
  };

  if (!generateDownloadUrl) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 h-9"
      title="ดาวน์โหลด"
      onClick={handleDownload}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">ดาวน์โหลด</span>
    </Button>
  );
};

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface RightSidebarProps {
  document: Doc<"documents"> | null;
  setSelectedDocument: (document: Doc<"documents"> | null) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ document, setSelectedDocument }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMoveToFolderOpen, setIsMoveToFolderOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<Id<"folders"> | null>(null);
  const [previewDocumentId, setPreviewDocumentId] = useState<Id<"documents"> | undefined>(undefined);

  const folders = useQuery(api.folders.getFolders, {});
  const moveDocument = useMutation(api.document.moveDocument);
  const deleteDocument = useMutation(api.document_crud.deleteDocument);
  const generateDownloadUrl = useQuery(api.document.generateDownloadUrl, document ? { documentId: document._id } : "skip");

  const userPermissions = useQuery(api.document_sharing.getUserDocumentPermissions, document ? { documentId: document._id } : "skip");
  const currentUser = useQuery(api.users.getCurrentUser);

  const handleDelete = async () => {
    if (document && window.confirm("คุณแน่ใจหรือไม่ที่จะลบเอกสารนี้?")) {
      try {
        await deleteDocument({ documentId: document._id });
        setSelectedDocument(null); // Deselect the document after successful deletion
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
  };

  const handleMoveToFolder = async () => {
    if (document && selectedFolderId) {
      await moveDocument({ documentId: document._id, folderId: selectedFolderId });
      setIsMoveToFolderOpen(false);
    }
  };

  if (!document) {
    return (
      <aside className="w-full lg:w-80 xl:w-96 bg-white border-l border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex-shrink-0">
        <div className="p-6 flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
          <div className="text-center">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">เลือกเอกสารเพื่อดูรายละเอียด</p>
          </div>
        </div>
      </aside>
    );
  }

  const canDownload = userPermissions?.includes("download");
  const canEdit = userPermissions?.includes("edit_metadata");
  const canShare = userPermissions?.includes("resend");
  const isOwner = currentUser && document.ownerId === currentUser.id;

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col">
      {/* Header Section */}
      <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-lg lg:text-xl font-semibold text-slate-900 dark:text-slate-100 truncate mb-4 leading-tight">
          {document.name}
        </h3>

        {/* Action Buttons - Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
          {canDownload && (
            // <SimpleErrorBoundary fallback={null}>
            <DownloadButtonSection document={document} />
            // </SimpleErrorBoundary>
          )}
          {canShare && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-9"
              title="แชร์"
              onClick={() => setIsShareModalOpen(true)}
            >
              <Share className="h-4 w-4" />
              <span className="hidden sm:inline">แชร์</span>
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-9"
              title="แก้ไขข้อมูล"
            >
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">แก้ไข</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9"
            title="ดูตัวอย่าง"
            onClick={() => setPreviewDocumentId(document._id)}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">ดูตัวอย่าง</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-9"
            title="ย้ายไปโฟลเดอร์"
           onClick={() => setIsMoveToFolderOpen(true)}
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">ย้าย</span>
          </Button>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
              title="ลบ"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">ลบ</span>
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Document Information */}
        <div className="p-4 lg:p-6 space-y-6">
          {/* Upload Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">วันที่อัปโหลด</span>
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-sm pl-6">
              {formatRelative(new Date(document._creationTime), new Date())}
            </p>
          </div>

          <Separator />

          {/* File Size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">ขนาดไฟล์</span>
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-sm pl-6">
              {formatFileSize(document.fileSize)}
            </p>
          </div>

          <Separator />

          {/* File Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <FileType className="h-4 w-4" />
              <span className="text-sm font-medium">ประเภทไฟล์</span>
            </div>
            <Badge variant="secondary" className="ml-6 text-xs">
              {document.mimeType}
            </Badge>
          </div>

          {/* AI Categories */}
          {document.aiCategories && document.aiCategories.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Tag className="h-4 w-4" />
                  <span className="text-sm font-medium">หมวดหมู่ AI</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {document.aiCategories.map((tag: string, tagIndex: number) => {
                    const colors = [
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                      "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                      "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                    ];
                    const colorClass = colors[tagIndex % colors.length];
                    return (
                      <Badge
                        key={tagIndex}
                        variant="secondary"
                        className={`${colorClass} text-xs font-medium px-2 py-1 rounded-md border-0`}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Preview Section */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 lg:p-6">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            แสดงตัวอย่าง
          </h4>
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-48 lg:h-64 flex items-center justify-center">
            <div className="text-center text-slate-400 dark:text-slate-500">
              {generateDownloadUrl && (
                <iframe src={generateDownloadUrl} width="100%" height="100%"/>
                
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={document._id}
      />
     <Dialog open={isMoveToFolderOpen} onOpenChange={setIsMoveToFolderOpen}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>ย้ายไปยังโฟล์เดอร์</DialogTitle>
         </DialogHeader>
         <div className="grid gap-4 py-4">
           <Label>โปรดเลือกโฟล์เดอร์:</Label>
           <RadioGroup onValueChange={(value) => setSelectedFolderId(value as Id<"folders">)}>
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
             <Button variant="outline">ยกเลิก</Button>
           </DialogClose>
           <Button onClick={handleMoveToFolder} disabled={!selectedFolderId}>ยืนยัน</Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
     <DocModal docId={previewDocumentId} />
    </aside>
  );
};

export default RightSidebar;