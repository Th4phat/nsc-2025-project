"use client";

import NotificationSidebar from "@/components/NotificationSidebar";
import { useNotifications } from "@/hooks/use-notifications";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

export function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const unread = useQuery(api.document_sharing.getUnreadDocumentsWithDetails);
  const { showNotification, closeNotification } = useNotifications();
  const [isNotificationSidebarOpen, setNotificationSidebarOpen] =
    useState(false);

  useEffect(() => {
    if (unread && unread.length > 0) {
      showNotification(`You have ${unread.length} unread documents`, {
        tag: "unread-documents",
      });
      setNotificationSidebarOpen(true);
    } else {
      setNotificationSidebarOpen(false);
      closeNotification("unread-documents");
    }
  }, [unread, showNotification, closeNotification]);

  return (
    <>
      {children}
      <NotificationSidebar
        isOpen={isNotificationSidebarOpen}
        onClose={() => setNotificationSidebarOpen(false)}
        closeBrowserNotification={closeNotification}
      />
    </>
  );
}