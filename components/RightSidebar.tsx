import React, { useState, Component, ErrorInfo, ReactNode } from "react";
import { ShareModal } from "@/components/ShareModal";
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from "convex/react"; // Added useMutation
import { api } from "../convex/_generated/api";

import { Doc } from "../convex/_generated/dataModel";
import { formatRelative } from "date-fns";

// Simple Error Boundary Component
interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
class SimpleErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SimpleErrorBoundary caught an error:", error, errorInfo);
    // You could log this to an error reporting service
  }

  render() {
    if (this.state.hasError) {
      // You could check this.state.error.message here for specific error handling
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Component for the Download Button and its logic
interface DownloadButtonSectionProps {
  document: Doc<"documents">;
}
const DownloadButtonSection: React.FC<DownloadButtonSectionProps> = ({ document }) => {
  const generateDownloadUrl = useQuery(api.document.generateDownloadUrl, { documentId: document._id });

  const handleDownload = async () => {
    if (generateDownloadUrl && document) { // generateDownloadUrl is the URL string here
      const a = window.document.createElement("a");
      a.href = generateDownloadUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = document.name; // Suggest filename
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    }
  };

  if (!generateDownloadUrl) {
    // If URL is not available (null, undefined, empty) or query is loading/skipped, render nothing.
    return null;
  }

  return (
    <Button
      variant="ghost"
      className=""
      title="ดาวน์โหลด"
      onClick={handleDownload}
    >
      {/* Download Icon */}
      ดาวน์โหลด
    </Button>
  );
};


interface RightSidebarProps {
  document: Doc<"documents"> | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ document }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const deleteDocument = useMutation(api.document.deleteDocument);

  // Fetch user permissions for the current document
  const userPermissions = useQuery(api.document.getUserDocumentPermissions, document ? { documentId: document._id } : "skip");

  // Fetch the current authenticated user's ID
  const currentUser = useQuery(api.users.getCurrentUser); // Using the new Convex query

  const handleDelete = async () => {
    if (document) {
      // Optional: Add a confirmation dialog here
      // e.g., if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDocument({ documentId: document._id });
        // Optionally, navigate away or show a success message
        // For now, the component will re-render and document might become null if it was the active one
      } catch (error) {
        console.error("Failed to delete document:", error);
        // Optionally, show an error message to the user
      }
      // }
    }
  };

  if (!document) {
    return null;
  }

  // Determine button visibility based on permissions and ownership
  const canDownload = userPermissions?.includes("download");
  const canEdit = userPermissions?.includes("edit_metadata"); // Corrected permission for editing
  const canShare = userPermissions?.includes("resend"); // Existing share button logic
  const isOwner = currentUser && document.ownerId === currentUser; // Check if current user is the owner

  return (
    <aside className="w-1/4 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 truncate mb-2">
          {document.name}
        </h3>
        <div className="flex items-center space-x-2">
          {canDownload && (
            <SimpleErrorBoundary fallback={null}>
              <DownloadButtonSection document={document} />
            </SimpleErrorBoundary>
          )}
          {canShare && (
            <Button
              className="hover:cursor-pointer"
              variant="ghost"
              title="แชร์"
              onClick={() => setIsShareModalOpen(true)}
            >
              {/* Share Icon */}
              แชร์
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              className=""
              title="แก้ไขข้อมูล"
            >
              {/* Edit Icon */}
              แก้ไข
            </Button>
          )}

            <Button
              variant="ghost"
              className=""
              title="ย้ายไปโฟลเดอร์"
            >
              {/* Move to Folder Icon */}
              ย้าย
            </Button>

          {isOwner && (
            <Button
              variant="ghost"
              className="p-1.5 rounded-full text-red-500 hover:bg-red-100 hover:text-red-700"
              title="ลบ"
             onClick={handleDelete} // Added onClick handler
           >
             {/* Delete Icon */}
             ลบ
           </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 text-sm">
         {/* Shared By: Need to fetch user information from ownerId or sharerId */}
        <div>
          <dt className="font-medium text-gray-500">วันที่อัปโหลด</dt>
          <dd className="text-gray-900 mt-1">{formatRelative(new Date(document._creationTime), new Date())}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">ขนาดไฟล์</dt>
          <dd className="text-gray-900 mt-1">{document.fileSize} bytes</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">ประเภทไฟล์</dt>
          <dd className="text-gray-900 mt-1">{document.mimeType}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500 mb-1">หมวดหมู่ AI</dt>
          <dd className="flex flex-wrap gap-1">
            {document.aiCategories && document.aiCategories.map((tag: string, tagIndex: number) => {
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
          </dd>
        </div>
        {/* <div>
          <dt className="font-medium text-gray-500 mb-1">แชร์ให้กับ</dt>
          <dd className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">
                  บจ
                </span>
                <span>สายฟ้า สว่างตา</span>
              </span>
              <span className="text-gray-500">ดูได้เท่านั้น</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs">
                  ชด
                </span>
                <span>ทองคำ ร่ำรวย</span>
              </span>
              <span className="text-gray-500">ดูได้เท่านั้น</span>
            </div>
          </dd>
        </div> */}
      </div>

      <div className="flex-grow p-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-500 mb-2">
          แสดงตัวอย่าง
        </h4>
        <div className="bg-gray-100 border border-gray-200 rounded-md h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            {/* File Question Icon */}
            ไม่สามารถแสดงตัวอย่างได้
          </div>
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={document._id}
      />
    </aside>
  );
};

export default RightSidebar;