"use client"
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";
import { DocumentList } from "@/components/DocList";

export default function DocumentUploader() {
  const { isAuthenticated } = useConvexAuth();
  console.log("is authed", isAuthenticated)
  const generateUploadUrl = useMutation(api.document.generateUploadUrl);
  const createDocument = useMutation(api.document_crud.createDocument);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

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

    setIsUploading(false);
  }

  return (
    <div>
      <input
        type="file"
        onChange={handleUpload}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}

      {/* <DocumentList /> */}
    </div>
  );
}