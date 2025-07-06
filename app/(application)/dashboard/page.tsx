"use client";
import React, { useState, useCallback, useMemo } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  type LucideIcon,
  Search,
  Inbox,
  X,
  Upload,
} from "lucide-react";
import RightSidebar from "@/components/RightSidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { formatRelative } from "date-fns";
import { th } from "date-fns/locale";
import { useSearchParams } from "next/navigation";
import { UploadModal } from "@/components/UploadModal";
import { DocModal } from "@/components/DocumentModal";

const fileTypeIcons: Record<string, { icon: LucideIcon; colorClass: string }> = {
  "application/pdf": {
    icon: FileText,
    colorClass: "text-red-500 dark:text-red-400",
  },
  "image/png": {
    icon: FileImage,
    colorClass: "text-green-500 dark:text-green-400",
  },
  "image/jpeg": {
    icon: FileImage,
    colorClass: "text-green-500 dark:text-green-400",
  },
};

export default function Page() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const docid = searchParams.get("documentId");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<Doc<"documents"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  if (docid) {
    console.log(docid)
  }
  const documents = useQuery(
    mode === "own"
      ? api.document.listOwnedDocuments
      : mode === "shared"
      ? api.document_sharing.listSharedDocuments
      : api.document.getAllDocuments,
    {
    },
  )

  const filteredDocuments = useMemo(() => {
    return documents?.filter((document) =>
      document.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);
  console.log(filteredDocuments)
  const unreadDocuments = useQuery(api.document_sharing.getUnreadDocuments);
  const unreadDocumentIds = useMemo(() => {
    return new Set(unreadDocuments ?? []);
  }, [unreadDocuments]);

  const markDocumentAsRead = useMutation(
    api.document_sharing.markDocumentAsRead,
  );


  const handleDocumentClick = useCallback((document: Doc<"documents">) => {
    if (selectedDocument?._id === document._id) {
      setSelectedDocument(null);
    } else {
      setSelectedDocument(document);
      markDocumentAsRead({ documentId: document._id });
    }
  }, [selectedDocument, markDocumentAsRead]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <header className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-10 h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-6" />

            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              อัพโหลดเอกสาร
            </Button>
            {docid && <DocModal docId={docid} />}
            <UploadModal
              isOpen={isUploadModalOpen}
              onClose={() => setIsUploadModalOpen(false)}
            />
            <div className="relative w-full max-w-md">
              <Label htmlFor="search" className="sr-only">
                ค้นหาเอกสารด้วยคำสำคัญ
              </Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาเอกสารด้วยคำสำคัญ..."
                className="pl-10 h-10"
              />
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            </div>
            
            {selectedDocument && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocument(null)}
                className="ml-auto shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </header>
          
          <main
            className={`flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto flex flex-col lg:flex-row relative`}
          >

            <div className="flex-1 bg-white dark:bg-slate-900 lg:rounded-lg lg:shadow-sm lg:m-4 overflow-hidden">
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {documents && filteredDocuments && filteredDocuments.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Inbox className="h-16 w-16 text-slate-400 dark:text-slate-600" />
                    <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-slate-200">
                      ไม่พบเอกสารที่ค้นหา
                    </h3>
                  </div>
                )}
                {filteredDocuments?.map((document) => {
                  const isSelected = selectedDocument?._id === document._id;
                  return (
                    <li
                      key={document._id}
                      className={`flex items-center px-4 py-3 cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/50 border-l-4 border-blue-500"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                      onClick={() => handleDocumentClick(document)}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 bg-slate-100 border-slate-300 rounded mr-4 flex-shrink-0"
                        checked={isSelected}
                        readOnly
                      />
                      {React.createElement(
                        fileTypeIcons[document.mimeType]?.icon || FileText,
                        {
                          className: `mr-3 ${
                            fileTypeIcons[document.mimeType]?.colorClass ||
                            "text-slate-500"
                          } flex-shrink-0`,
                          width: 24,
                          height: 24,
                        },
                      )}
                      <div className="flex-grow truncate mr-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {document.name}
                          {unreadDocumentIds.has(document._id) && (
                            <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block"></span>
                          )}
                        </div>
                      </div>
                      <div className="hidden md:flex items-center flex-shrink-0 ml-auto space-x-2">
                        {document.aiCategories?.map(
                          (tag: string, tagIndex: number) => (
                            <Badge
                              key={tagIndex}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ),
                        )}
                        <span className="text-sm text-slate-500 dark:text-slate-400 w-28 text-right">
                          {formatRelative(
                            new Date(document._creationTime),
                            new Date(),
                            { locale: th }
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <RightSidebar document={selectedDocument} setSelectedDocument={setSelectedDocument} />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}