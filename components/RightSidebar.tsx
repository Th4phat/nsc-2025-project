"use client"
import React, { useState } from "react";
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
import { th } from "date-fns/locale";
import {
  Download,
  Share,
  FolderOpen,
  Trash2,
  Calendar,
  HardDrive,
  FileType,
  Tag,
  Edit,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

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
      <span className="">ดาวน์โหลด</span>
    </Button>
  );
};

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
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState<string>("");

  const folders = useQuery(api.folders.getFolders, {});

  React.useEffect(() => {
    setPreviewDocumentId(undefined);
  }, [document]);

  React.useEffect(() => {
    setNewName(document?.name ?? "");
  }, [document]);
  const moveDocument = useMutation(api.document.moveDocument);
  const softDeleteDocument = useMutation(api.document_crud.softDeleteDocument);
  const restoreDocument = useMutation(api.document_crud.restoreDocument);
  const permanentlyDeleteDocument = useMutation(api.document_crud.permanentlyDeleteDocument);
  const renameDocument = useMutation(api.document_crud.updateDocumentName);

  const userPermissions = useQuery(api.document_sharing.getUserDocumentPermissions, document ? { documentId: document._id } : "skip");
  const currentUser = useQuery(api.users.getCurrentUser);
  const sharerInfo = useQuery(api.document_sharing.getSharerForDocument, document ? { documentId: document._id } : "skip");

  const handleDelete = async () => {
    if (document && window.confirm("คุณแน่ใจหรือไม่ที่จะย้ายเอกสารนี้ไปถังขยะ?")) {
      try {
        await softDeleteDocument({ documentId: document._id });
        setSelectedDocument(null);
      } catch (error) {
        console.error("Failed to soft delete document:", error);
      }
    }
  };

  const handleRestore = async () => {
    if (document && window.confirm("คุณแน่ใจหรือไม่ที่จะกู้คืนเอกสารนี้?")) {
      try {
        await restoreDocument({ documentId: document._id });
        setSelectedDocument(null);
      } catch (error) {
        console.error("Failed to restore document:", error);
      }
    }
  };

  const handlePermanentDelete = async () => {
    if (document && window.confirm("คุณแน่ใจหรือไม่ที่จะลบเอกสารนี้อย่างถาวร? การดำเนินการนี้ไม่สามารถย้อนกลับได้.")) {
      try {
        await permanentlyDeleteDocument({ documentId: document._id });
        setSelectedDocument(null);
      } catch (error) {
        console.error("Failed to permanently delete document:", error);
      }
    }
  };

  const handleMoveToFolder = async () => {
    if (document && selectedFolderId) {
      await moveDocument({ documentId: document._id, folderId: selectedFolderId });
      setIsMoveToFolderOpen(false);
    }
  };

  const handleRename = async () => {
    if (!document) return;
    const trimmed = newName.trim();
    if (trimmed.length === 0) return;
    try {
      await renameDocument({ documentId: document._id, newName: trimmed });
      setSelectedDocument({ ...document, name: trimmed });
      setIsRenameOpen(false);
    } catch (error) {
      console.error("Failed to rename document:", error);
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

  const actionsReady = userPermissions !== undefined && currentUser !== undefined;
  const canDownload = actionsReady && userPermissions.includes("download");
  const canShare = actionsReady && userPermissions.includes("resend");
  const isOwner = actionsReady && currentUser && document.ownerId === currentUser.id;

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col">
      <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-lg lg:text-xl font-semibold text-slate-900 dark:text-slate-100 truncate mb-4 leading-tight">
          {document.name}
        </h3>
        {document.status !== "trashed" ? (
          actionsReady ? (
            <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              {canDownload && (
                <DownloadButtonSection document={document} />
              )}
              {canShare && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-9"
                  title="แชร์"
                  onClick={() => {
                    setIsShareModalOpen(true);
                    setPreviewDocumentId(undefined);
                  }}
                >
                  <Share className="h-4 w-4" />
                  <span className="">แชร์</span>
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
                <span className="">ดูตัวอย่าง</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-9"
                title="ย้ายไปโฟลเดอร์"
                onClick={() => {
                  setIsMoveToFolderOpen(true);
                  setPreviewDocumentId(undefined);
                }}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="">ย้าย</span>
              </Button>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-9"
                  title="เปลี่ยนชื่อ"
                  onClick={() => {
                    setIsRenameOpen(true);
                    setPreviewDocumentId(undefined);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  <span className="">เปลี่ยนชื่อ</span>
                </Button>
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  title="ย้ายไปถังขยะ"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="">ย้ายไปถังขยะ</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-slate-500">
              กำลังโหลดตัวเลือก...
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
              title="กู้คืน"
              onClick={handleRestore}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="">กู้คืน</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
              title="ลบอย่างถาวร"
              onClick={handlePermanentDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="">ลบอย่างถาวร</span>
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 lg:p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">วันที่อัปโหลด</span>
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-sm pl-6">
              {formatRelative(new Date(document._creationTime), new Date(), {
                locale: th
              })}
            </p>
          </div>

          {sharerInfo && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Share className="h-4 w-4" />
                  <span className="text-sm font-medium">แชร์โดย</span>
                </div>
                <p className="text-slate-900 dark:text-slate-100 text-sm pl-6">
                  {sharerInfo.name || sharerInfo.email}
                </p>
              </div>
            </>
          )}

          <Separator />

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

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <FileType className="h-4 w-4" />
              <span className="text-sm font-medium">ประเภทไฟล์</span>
            </div>
            <Badge variant="secondary" className="ml-6 text-xs">
              {
                document.mimeType === 'application/pdf'
                  ? 'PDF'
                  : document.mimeType ===
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ? 'Word Document'
                    : document.mimeType ===
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                      ? 'Excel Spreadsheet'
                      : document.mimeType.startsWith('image/')
                        ? 'Image'
                        : 'Unknown'
              }
            </Badge>
          </div>

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
      </ScrollArea>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={document._id}
      />
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เปลี่ยนชื่อเอกสาร</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label>ชื่อใหม่</Label>
            <Input value={newName} onChange={(e) => setNewName((e.target as HTMLInputElement).value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">ยกเลิก</Button>
            </DialogClose>
            <Button onClick={handleRename} disabled={!newName || newName.trim() === ""}>ยืนยัน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isMoveToFolderOpen} onOpenChange={setIsMoveToFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ย้ายไปยังโฟล์เดอร์</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label>โปรดเลือกโฟล์เดอร์</Label>
            <RadioGroup onValueChange={(value) => setSelectedFolderId(value as Id<"folders">)}>
              {folders?.map(folder => (
                <div key={folder._id} className="flex items-center space-x-2 p-2">
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
      <DocModal docId={previewDocumentId} onClose={() => setPreviewDocumentId(undefined)} />
    </aside>
  );
};

export default RightSidebar;