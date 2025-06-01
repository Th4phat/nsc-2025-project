"use client";
import React, { useState } from "react";
import { FileText, FileSpreadsheet, FileImage, type LucideIcon, Search } from "lucide-react";
import RightSidebar from "@/components/RightSidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { SearchForm } from "@/components/search-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Document {
  name: string;
  sharedBy: string;
  dateShared: string;
  fileSize: string;
  fileType: string;
  tags: string[];
}

export default function Page() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );

  const fileTypeIcons: Record<string, { icon: LucideIcon, colorClass: string }> = {
    "pdf": { icon: FileText, colorClass: "text-red-600" },
    "word": { icon: FileSpreadsheet, colorClass: "text-blue-600" }, // Using blue for Word documents
    "picture": { icon: FileImage, colorClass: "text-green-600" }, // Using green for PNG images
    // Add more mappings for other file types and colors as needed
  };

  const documents: Document[] = [
    {
      name: "สรุปการประชุมประจำสัปดาห์ 22 เม.ย. 2568.docx",
      sharedBy: "เลขาฯ บริหาร",
      dateShared: "วันนี้",
      fileSize: "550 KB",
      fileType: "word",
      tags: ["รายงาน", "การประชุม"],
    },
    {
      name: "แผนกลยุทธ์ปี 2569 ฉบับร่าง.docx",
      sharedBy: "สมชาย สุขสวัสดิ์",
      dateShared: "24 เมษายน 2568, 10:30 น.",
      fileSize: "3.1 MB",
      fileType: "word",
      tags: ["แผนกลยุทธ์", "การตลาด"],
    },
    {
      name: "ภาพถ่ายกิจกรรม CSR 2568.png",
      sharedBy: "ฝ่ายสื่อสารองค์กร",
      dateShared: "20 เม.ย. 2568",
      fileSize: "15.8 MB",
      fileType: "picture",
      tags: ["CSR", "กิจกรรม"],
    },
    {
      name: "แบบฟอร์มขอเบิกค่าใช้จ่าย.pdf",
      sharedBy: "ระบบ HR",
      dateShared: "23 เม.ย. 2568, 09:00 น.",
      fileSize: "180 KB",
      fileType: "pdf",
      tags: ["HR", "แบบฟอร์ม"],
    },
    {
      name: "พรีเซนเทชั่นรอบ Demo.pdf",
      sharedBy: "ทีมพัฒนาผลิตภัณฑ์",
      dateShared: "เมื่อวาน",
      fileSize: "5.7 MB",
      fileType: "pdf",
      tags: ["Demo", "ผลิตภัณฑ์"],
    },
  ];


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
      <main className="flex-grow bg-gray-50 p-4 overflow-y-auto flex">
      <div className="bg-white rounded-lg shadow overflow-hidden w-3/4">
        <ul>
          {documents.map((document, index) => (
            <li
              key={index}
              className="flex items-center px-4 py-3 border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
              onClick={() => setSelectedDocument(document)}
            >
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600 rounded mr-4 flex-shrink-0"
              />

              {React.createElement(fileTypeIcons[document.fileType]?.icon || FileText, {
                className: `lucide lucide-file-type mr-3 ${fileTypeIcons[document.fileType]?.colorClass || "text-gray-600"} flex-shrink-0`,
                width: 20,
                height: 20,
              })}
              <div className="flex-grow truncate mr-4">
                <div className="font-medium text-gray-900 truncate">
                  {document.name}
                </div>
                {/* <div className="text-sm text-gray-500 truncate">
                  แชร์โดย {document.sharedBy}
                </div> */}
              </div>
              <div className="flex items-center flex-shrink-0 ml-auto space-x-2">
                {document.tags.map((tag, tagIndex) => {
                  const colors = ["bg-green-100", "bg-yellow-100", "bg-red-100", "bg-blue-100", "bg-purple-100"];
                  const textColor = ["text-green-800", "text-yellow-800", "text-red-800", "text-blue-800", "text-purple-800"];
                  const colorIndex = tagIndex % colors.length;
                  return (
                    <span
                      key={tagIndex}
                      className={`${colors[colorIndex]} ${textColor[colorIndex]} text-xs font-medium px-2.5 py-0.5 rounded-full`}
                    >
                      {tag}
                    </span>
                  );
                 })}
                 <span className="text-sm text-gray-500 w-24 text-right">
                   {document.dateShared}
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
