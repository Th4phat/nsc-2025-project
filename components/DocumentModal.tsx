import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { formatRelative } from "date-fns";
import { th } from "date-fns/locale";

interface DocModalProps {
  docId?: string;
}

export function DocModal({ docId }: DocModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (docId) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [docId]);

  const documentData = useQuery(api.document.getDocumentAndUrl, docId ? { documentId: docId as Id<"documents"> } : "skip");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-4xl md:max-w-6xl lg:max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{documentData ? documentData.name : "เอกสารไม่มีชื่อ"}</DialogTitle>
          <DialogDescription>
            {documentData ? formatRelative(
              new Date(documentData.uploaded),
              new Date(),
              { locale: th }
            ) : "กำลังโหลด..."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
          {documentData?.mimeType.startsWith("image/") && (
            <img src={documentData.url} alt="Document" className="max-w-full max-h-full object-contain" />
          )}
          {documentData?.mimeType === "application/pdf" && (
            <iframe src={documentData.url} className="w-full h-full border-none"></iframe>
          )}
          {!documentData && docId && (
            <p>กำลังโหลด...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
