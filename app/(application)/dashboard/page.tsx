// app/your-route/page.tsx
"use client";
import React, { useState, useCallback } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  type LucideIcon,
  Search,
  UploadCloud,
  CheckCircle,
  Inbox,
  X,
  Upload,
  Plus,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
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
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { formatRelative } from "date-fns";
import { useSearchParams } from "next/navigation";

export default function Page() {
  const [selectedDocument, setSelectedDocument] =
    useState<Doc<"documents"> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const folderId = searchParams.get("folderId") as Id<"folders"> | null;

  const documents = useQuery(api.document.getAllDocuments, {
    // folderId: folderId ?? undefined,
    // category: category ?? undefined,
  });

  const generateUploadUrl = useMutation(api.document.generateUploadUrl);
  const createDocument = useMutation(api.document_crud.createDocument);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadedFileName(file.name);
    
    try {
      const postUrl = await generateUploadUrl();
      setUploadProgress(30);
      
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      
      setUploadProgress(70);
      
      await createDocument({
        name: file.name,
        fileId: storageId,
        mimeType: file.type,
        fileSize: file.size,
      });
      
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedFileName("");
      }, 800);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedFileName("");
    }
  }, [generateUploadUrl, createDocument]);

  // React Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    }
  }, [handleFileUpload]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    open: openFileDialog
  } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'text/plain': ['.txt'],
      // Add more file types as needed
    },
    multiple: false,
    noClick: true, // We'll handle clicks manually
    noKeyboard: true
  });

  const handleDocumentClick = (document: Doc<"documents">) => {
    if (selectedDocument?._id === document._id) {
      setSelectedDocument(null);
    } else {
      setSelectedDocument(document);
    }
  };

  const fileTypeIcons: Record<string, { icon: LucideIcon; colorClass: string }> = {
    "application/pdf": {
      icon: FileText,
      colorClass: "text-red-500 dark:text-red-400",
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      icon: FileSpreadsheet,
      colorClass: "text-blue-500 dark:text-blue-400",
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

  // Determine dropzone styling based on drag state
  const getDropzoneClassName = () => {
    if (isDragReject) {
      return "border-red-400 bg-red-50/90 dark:bg-red-950/90";
    }
    if (isDragAccept) {
      return "border-green-400 bg-green-50/90 dark:bg-green-950/90";
    }
    if (isDragActive) {
      return "border-blue-400 bg-blue-50/90 dark:bg-blue-950/90";
    }
    return "";
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <header className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-10 h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-6" />
            
            {/* Upload Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={openFileDialog}
              className="shrink-0"
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            
            <div className="relative w-full max-w-md">
              <Label htmlFor="search" className="sr-only">
                ค้นหาเอกสารด้วยคำสำคัญ
              </Label>
              <Input
                id="search"
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
            {...getRootProps()}
            className={`flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto flex flex-col lg:flex-row relative ${getDropzoneClassName()}`}
          >
            <input {...getInputProps()} />
            
            {/* Upload Overlay */}
            {isUploading && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-xl max-w-sm w-full mx-4 text-center">
                  <div className="mb-4">
                    {uploadProgress === 100 ? (
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    ) : (
                      <UploadCloud className="h-16 w-16 text-blue-500 mx-auto" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    {uploadProgress === 100 ? "Upload Complete!" : "Uploading File"}
                  </h3>
                  
                  <p className="text-slate-600 dark:text-slate-400 mb-4 truncate text-sm">
                    {uploadedFileName}
                  </p>
                  
                  {uploadProgress < 100 && (
                    <>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {Math.round(uploadProgress)}% uploaded
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Drag Active Overlay */}
            {isDragActive && !isUploading && (
              <div className="absolute inset-0 border-2 border-dashed flex items-center justify-center z-40">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg text-center">
                  <div className="mb-2">
                    {isDragReject ? (
                      <X className="h-12 w-12 text-red-500 mx-auto" />
                    ) : (
                      <UploadCloud className="h-12 w-12 text-blue-500 mx-auto" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {isDragReject ? "File type not supported" : "Drop your file here"}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {isDragReject 
                      ? "Please upload PDF, DOCX, or image files" 
                      : "Release to upload your document"
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="flex-1 bg-white dark:bg-slate-900 lg:rounded-lg lg:shadow-sm lg:m-4 overflow-hidden">
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {documents && documents.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Inbox className="h-16 w-16 text-slate-400 dark:text-slate-600" />
                    <h3 className="mt-4 text-lg font-medium text-slate-800 dark:text-slate-200">
                      No documents found
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Drag and drop a file here or click the upload button to get started.
                    </p>
                    <Button
                      variant="outline"
                      onClick={openFileDialog}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                )}
                {documents?.map((document) => {
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