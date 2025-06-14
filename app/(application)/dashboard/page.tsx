"use client";
import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  type LucideIcon,
  Search,
} from "lucide-react";
import RightSidebar from "@/components/RightSidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { formatRelative } from "date-fns";
import { useSearchParams } from "next/navigation"; // Import useSearchParams

export default function Page() {
  const [selectedDocument, setSelectedDocument] = useState<Doc<"documents"> | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const searchParams = useSearchParams(); // Get search params
  const category = searchParams.get("category"); // Get category from search params

  const documents = useQuery(api.document.getMyDocuments, { category: category ?? undefined }); // Pass category to query

  const generateUploadUrl = useMutation(api.document.generateUploadUrl);
  const createDocument = useMutation(api.document.createDocument);

  async function handleFileUpload(file: File) {
    if (!file) return;

    setIsUploading(true);

    try {
      // Step 1: Get a secure URL to upload the file to
      const postUrl = await generateUploadUrl();

      // Step 2: Upload the file directly to the returned URL
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json(); // This is the v.id("_storage")

      // Step 3: Create the document record, linking it to the uploaded file
      await createDocument({
        name: file.name,
        fileId: storageId,
        mimeType: file.type,
        fileSize: file.size,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      // Optionally, show an error message to the user
    } finally {
      setIsUploading(false);
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Add visual cues for drag over if desired
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
      event.dataTransfer.clearData();
    }
  };

  const fileTypeIcons: Record<string, { icon: LucideIcon; colorClass: string }> =
    {
      "application/pdf": { icon: FileText, colorClass: "text-red-600" },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        { icon: FileSpreadsheet, colorClass: "text-blue-600" },
      "image/png": { icon: FileImage, colorClass: "text-green-600" },
      "image/jpeg": { icon: FileImage, colorClass: "text-green-600" },
      // Add more mappings for other file types and colors as needed
    };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex sticky top-0 bg-background h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="relative w-1/3">
            <Label htmlFor="search" className="sr-only">
              ค้นหาเอกสารด้วยคำสำคัญ
            </Label>
            <Input
              id="search"
              placeholder="ค้นหาเอกสารด้วยคำสำคัญ..."
              className="pl-8"
            />
            <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
          </div>
        </header>
        <main
          className="flex-grow bg-gray-50 p-4 overflow-y-auto flex relative"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isUploading && (
            <div className="absolute inset-0 bg-slate-600 bg-opacity-50 flex items-center justify-center z-50">
              <p className="text-white text-xl p-4 bg-slate-800 rounded-lg">Uploading...</p>
            </div>
          )}
          <div className="bg-white rounded-lg shadow overflow-hidden w-3/4">
            <ul>
              {documents?.map((document) => (
                <li
                  key={document._id}
                  className="flex items-center px-4 py-3 border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setSelectedDocument(document)}
                >
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600 rounded mr-4 flex-shrink-0"
                  />

                  {React.createElement(
                    fileTypeIcons[document.mimeType]?.icon || FileText,
                    {
                      className: `lucide lucide-file-type mr-3 ${
                        fileTypeIcons[document.mimeType]?.colorClass ||
                        "text-gray-600"
                      } flex-shrink-0`,
                      width: 20,
                      height: 20,
                    },
                  )}
                  <div className="flex-grow truncate mr-4">
                    <div className="font-medium text-gray-900 truncate">
                      {document.name}
                    </div>
                  </div>
                  <div className="flex items-center flex-shrink-0 ml-auto space-x-2">
                    {document.aiCategories?.map(
                      (tag: string, tagIndex: number) => {
                        const colors = [
                          "bg-green-100",
                          "bg-yellow-100",
                          "bg-red-100",
                          "bg-blue-100",
                          "bg-purple-100",
                        ];
                        const textColor = [
                          "text-green-800",
                          "text-yellow-800",
                          "text-red-800",
                          "text-blue-800",
                          "text-purple-800",
                        ];
                        const colorIndex = tagIndex % colors.length;
                        return (
                          <span
                            key={tagIndex}
                            className={`${colors[colorIndex]} ${textColor[colorIndex]} text-xs font-medium px-2.5 py-0.5 rounded-full`}
                          >
                            {tag}
                          </span>
                        );
                      },
                    )}
                    <span className="text-sm text-gray-500 w-24 text-right">
                      {formatRelative(
                        new Date(document._creationTime),
                        new Date(),
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <RightSidebar document={selectedDocument} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
