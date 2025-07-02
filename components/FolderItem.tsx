"use client";

import * as React from "react";
import { Folder } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";

interface FolderItemProps {
  folder: Doc<"folders">;
}

export function FolderItem({ folder }: FolderItemProps) {
  const documents = useQuery(api.document.getDocumentsInFolder, { folderId: folder._id });

  const nestedDocuments = documents?.map(doc => ({
    title: doc.name,
    url: `/dashboard?documentId=${doc._id}`,
    documentId: doc._id,
  })) || [];

  const navItem = {
    title: folder.name,
    url: `/dashboard?folderId=${folder._id}`,
    icon: Folder,
    items: nestedDocuments,
  };

  // This is a placeholder. We need to figure out how to render this.
  // For now, let's just return a div.
  return <div>{navItem.title}</div>;
}