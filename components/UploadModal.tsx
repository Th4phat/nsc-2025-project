"use client";

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

    const result = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!result.ok) {
      const errorData = await result.json();
      console.error("Upload failed:", errorData.error);
      // Optionally, show an error message to the user
      return;
    }

    // If needed, handle success response from the API route
    // const { documentId } = await result.json();
    // console.log("Document uploaded with ID:", documentId);

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
    </Dialog>
  );
}