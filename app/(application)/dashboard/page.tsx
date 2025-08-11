"use client";
import React, { useState, useCallback, useMemo } from "react";
import {
  FileText,
  FileImage,
  type LucideIcon,
  Inbox,
  X,
  Upload,
} from "lucide-react";

import RightSidebar from "@/components/RightSidebar";
import {
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdvancedSearchBar } from "@/components/AdvanceSearch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { format } from "date-fns";
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
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    icon: FileText,
    colorClass: "text-blue-500 dark:text-blue-400",
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    icon: FileText,
    colorClass: "text-blue-500 dark:text-blue-400",
  },
};

// Friendly short labels for UI (avoid rendering full mime strings)
const mimeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
};
 
// Helper to safely escape search terms for RegExp
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Small component that highlights occurrences of `query` inside `text`.
// Uses a <mark> with subtle styling so the highlight is visible in both light/dark.
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-600/40 px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Helper: return a short excerpt from `text` centered on the first occurrence of `query`.
// If the query isn't found, return the start of the text (trimmed).
// radius controls how many characters appear on each side of the match.
function getSnippet(text: string, query: string, radius = 80) {
  if (!text) return "";
  const plain = text.toString();
  if (!query) {
    const s = plain.slice(0, radius * 2);
    return s + (plain.length > s.length ? "..." : "");
  }
  const lower = plain.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) {
    const s = plain.slice(0, radius * 2);
    return s + (plain.length > s.length ? "..." : "");
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(plain.length, idx + q.length + radius);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < plain.length ? "..." : "";
  return prefix + plain.slice(start, end).trim() + suffix;
}

export default function Page() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const docid = searchParams.get("documentId");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<Doc<"documents"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Advanced filter state (client-side)
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [mimeTypesFilter, setMimeTypesFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState<string | null>(null); // yyyy-mm-dd
  const [matchMode, setMatchMode] = useState<
    "default" | "phrase" | "whole_word" | "case_sensitive"
  >("default");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const fileTypeOptions = useMemo(() => {
    return Object.keys(fileTypeIcons).map((mt) => ({
      value: mt,
      label: mimeLabels[mt] ?? mt.split("/").pop() ?? mt,
    }));
  }, []);

  const onClear = useCallback(() => {
    setAuthorFilter(null);
    setMimeTypesFilter([]);
    setCategoryFilter(null);
    setDateFrom(null);
    setDateTo(null);
    setMatchMode("default");
    setIsAdvancedOpen(false);
    setSearchTerm("");
  }, []);

  if (docid) {
    console.log(docid)
  }
  const documents = useQuery(
    mode === "own"
      ? api.document.listOwnedDocuments
      : mode === "shared"
        ? api.document_sharing.listSharedDocuments
        : mode === "trash"
          ? api.document.listTrashedDocuments
          : api.document.getAllDocuments,
    {},
  );

  // Always call the server-side search query but pass an empty string when there's no search term.
  // The server will return all documents when query is empty; the UI chooses which source to use.
  const searchResults = useQuery(api.document_crud.searchDocuments, {
    query: searchTerm || "",
  });
  console.log(searchResults);

  // Derived options from client data (computed from loaded documents)
  const availableAuthors = useMemo(() => {
    const map = new Map<string, number>();
    (documents || []).forEach((d: any) => {
      if (d?.ownerId) map.set(d.ownerId, (map.get(d.ownerId) ?? 0) + 1);
    });
    return Array.from(map.keys()).sort();
  }, [documents]);

  const availableCategories = useMemo(() => {
    const s = new Set<string>();
    (documents || []).forEach((d: any) => {
      if (Array.isArray(d.aiCategories)) {
        d.aiCategories.forEach((c: string) => s.add(c));
      }
    });
    return Array.from(s).sort();
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const docs: Doc<"documents">[] = (documents || []) as Doc<"documents">[];

    // Normalizer helpers
    const normalize = (s: any) => {
      try {
        if (!s) return "";
        const str = s.toString().replace(/[\x00-\x1F\x7F]/g, "");
        try {
          return str.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
        } catch {
          return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
        }
      } catch {
        return (s || "").toString();
      }
    };

    const buildMatcher = (term: string) => {
      if (!term) return () => true;
      if (matchMode === "case_sensitive") {
        return (text: string) => (text || "").includes(term);
      }
      if (matchMode === "whole_word") {
        const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "iu");
        return (text: string) => !!text.match(pattern);
      }
      if (matchMode === "phrase") {
        const pattern = new RegExp(escapeRegExp(term), "iu");
        return (text: string) => !!text.match(pattern);
      }
      // default: normalize & case-insensitive substring
      const nTerm = normalize(term).toLowerCase();
      return (text: string) => normalize(text || "").toLowerCase().includes(nTerm);
    };

    const matcher = buildMatcher(searchTerm);

    const matchesFilters = (doc: Doc<"documents">) => {
      // Access: document should already be in `documents` query (owned/shared)
      // Owner filter
      if (authorFilter && doc.ownerId !== authorFilter) return false;

      // mime types
      if (mimeTypesFilter.length > 0 && !mimeTypesFilter.includes(doc.mimeType)) return false;

      // category
      if (categoryFilter) {
        if (!Array.isArray(doc.aiCategories) || !doc.aiCategories.includes(categoryFilter)) return false;
      }

      // date range
      if (dateFrom) {
        const fromMs = new Date(dateFrom).getTime();
        if (doc._creationTime < fromMs) return false;
      }
      if (dateTo) {
        // include the whole day of dateTo
        const toMs = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (doc._creationTime > toMs) return false;
      }

      // text search
      if (searchTerm.trim().length > 0) {
        const aggregate =
          `${doc.name ?? ""} ${doc.description ?? ""} ${(doc.aiCategories ?? []).join(" ")} ${
            (doc.searchableText || "")
          }`;
        return matcher(aggregate);
      }

      return true;
    };

    const res = docs.filter(matchesFilters).sort((a, b) => b._creationTime - a._creationTime);
    return res;
  }, [documents, searchTerm, authorFilter, mimeTypesFilter, categoryFilter, dateFrom, dateTo, matchMode]);
  console.log("filteredDocuments", filteredDocuments)
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

    <div className="flex flex-col h-screen">
      <header className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-10 h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-6" />

        <Button onClick={() => setIsUploadModalOpen(true)} className="h-9 px-4 sm:h-10 sm:px-4 md:h-9 md:px-4 lg:h-10 lg:px-4 xl:h-10 xl:px-4">
          <Upload className="h-4 w-4 mr-2 sm:mr-0" />
          <span className="hidden sm:inline">อัพโหลดเอกสาร</span>
        </Button>
        {docid && <DocModal docId={docid} />}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
        <div className="relative w-full">
          <AdvancedSearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isAdvancedOpen={isAdvancedOpen}
            setIsAdvancedOpen={setIsAdvancedOpen}
            availableAuthors={availableAuthors}
            availableCategories={availableCategories}
            authorFilter={authorFilter}
            setAuthorFilter={setAuthorFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            mimeTypesFilter={mimeTypesFilter}
            setMimeTypesFilter={setMimeTypesFilter}
            fileTypeOptions={fileTypeOptions}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            matchMode={matchMode}
            setMatchMode={setMatchMode}
            onClear={onClear}
          />
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
                  className={`flex items-center px-4 py-3 cursor-pointer ${isSelected
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
                      className: `mr-3 ${fileTypeIcons[document.mimeType]?.colorClass ||
                        "text-slate-500"
                        } flex-shrink-0`,
                      width: 24,
                      height: 24,
                    },
                  )}
                  <div className="flex-grow truncate mr-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate flex items-center">
                      <HighlightedText text={document.name} query={searchTerm} />
                      {unreadDocumentIds.has(document._id) && (
                        <span className="ml-2 h-2 w-2 rounded-full bg-red-500 inline-block"></span>
                      )}
                      {document.status === "processing" && (
                        <span
                          className="ml-2 inline-block h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent dark:border-blue-400 animate-spin"
                          aria-hidden="true"
                          title="Processing"
                        />
                      )}
                    </div>
                    {/* Show a short snippet from searchableText when a search term is present.
                        This uses the server-stored `searchableText` (if available) and highlights the query. */}
                    {searchTerm.trim() && (document as any).searchableText ? (
                      <div className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                        <HighlightedText
                          text={getSnippet((document as any).searchableText, searchTerm)}
                          query={searchTerm}
                        />
                      </div>
                    ) : null}
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
                      {format(
                        new Date(document._creationTime),
                        "dd/MMM/yyyy",
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

  );
}