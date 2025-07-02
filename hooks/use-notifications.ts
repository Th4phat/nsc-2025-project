"use client";

import { useEffect, useRef } from "react";

export function useNotifications() {
  const notificationsRef = useRef<Map<string, Notification>>(new Map());

  useEffect(() => {
    if ("Notification" in window && window.Notification.permission !== "granted") {
      window.Notification.requestPermission();
    }

    return () => {
      notificationsRef.current.forEach((notification) => notification.close());
      notificationsRef.current.clear();
    };
  }, []);

  const showNotification = (title: string, options?: NotificationOptions) => {
    if ("Notification" in window && window.Notification.permission === "granted") {
      const notification = new window.Notification(title, options);
      if (options?.tag) {
        notificationsRef.current.set(options.tag, notification);
      }
      notification.onclose = () => {
        if (options?.tag) {
          notificationsRef.current.delete(options.tag);
        }
      };
    }
  };

  const closeNotification = (tag: string) => {
    if (notificationsRef.current.has(tag)) {
      notificationsRef.current.get(tag)?.close();
      notificationsRef.current.delete(tag);
    }
  };

  return { showNotification, closeNotification };
}