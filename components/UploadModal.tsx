"use client";

import { toast } from "sonner";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";


interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [isClassified, setIsClassified] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    formData.append("classified", isClassified.toString());

    await toast.promise(
      fetch("/api/upload", {
        method: "POST",
        body: formData,
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }
        return response;
      }),
      {
        loading: "กำลังอัปโหลดเอกสาร...",
        success: "อัปโหลดเอกสารสำเร็จ!",
        error: (err) => `อัพโหลดเอกสารไม่สำเร็จ: ${err.message}`,
      },
    );

    onClose();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept:{
    "image/png": [".png"],
    "image/jpeg": [".jpeg", ".jpg"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.ms-excel": [".xls"]
  } });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>อัพโหลดเอกสาร</DialogTitle>
        </DialogHeader>
        <div
          {...getRootProps()}
          className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer ${
            isDragActive ? "border-primary" : "border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>ลากไฟล์มาที่นี่...</p>
          ) : (
            <p>ลากไฟล์มาที่นี่หรือกดคลิ๊กเพื่อเลือกไฟล์</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="classified-switch"
            checked={isClassified}
            onCheckedChange={setIsClassified}
          />
          <Label htmlFor="classified-switch">เป็นเอกสารลับ</Label>
        </div>
      </DialogContent>
      {/* <Toaster richColors/> */}
    </Dialog>
  );
}