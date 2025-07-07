"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  closeBrowserNotification: (tag: string) => void;
}

const NotificationSidebar: React.FC<NotificationSidebarProps> = ({
  isOpen,
  onClose,
  closeBrowserNotification,
}) => {
  const unread = useQuery(api.document_sharing.getUnreadDocumentsWithDetails);
  const markAsRead = useMutation(api.document_sharing.markDocumentAsRead);

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col">
      <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg lg:text-xl font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">
            Notifications
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 lg:p-6 space-y-4">
          {unread?.map((doc) => (
            <div
              key={doc._id}
              className="p-2 rounded-md hover:bg-gray-100 cursor-pointer"
              onClick={async () => {
                await markAsRead({ documentId: doc._id });
                if (unread?.length === 1) {
                  closeBrowserNotification("unread-documents");
                }
              }}
            >
              <p className="font-semibold">{doc.name}</p>
              <p className="text-sm text-gray-500">
                Shared by: {doc.shareCreator?.name}
              </p>
            </div>
          ))}
          {(!unread || unread.length === 0) && (
            <p className="text-center text-gray-500">No unread notifications</p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default NotificationSidebar;