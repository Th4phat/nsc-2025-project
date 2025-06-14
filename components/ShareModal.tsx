"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Plus, Users, Mail, Share as ShareIcon, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: Id<"documents">;
}

type PermissionType =
  | "view"
  | "download"
  | "comment"
  | "edit_metadata"
  | "resend";

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  // State for recipients selected in the UI, along with their assigned permissions
  const [selectedRecipientsWithPermissions, setSelectedRecipientsWithPermissions] = useState<
    { userId: Id<"users">; permissions: PermissionType[] }[]
  >([]);
  const [autoShareEnabled, setAutoShareEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convex hooks for data
  const sharedUsersData = useQuery(api.document.getSharedUsersForDocument, {
    documentId,
  });
  const allUsersData = useQuery(api.myFunctions.listUsersForShare, {
    searchQuery: searchTerm.length > 0 ? searchTerm : undefined,
  });
  // Fetch the document details to get AI suggested recipients if auto-share is enabled
  const documentDetails = useQuery(api.document.getDocumentDetails, { documentId });


  // Convex hooks for mutations
  const shareDocumentMutation = useMutation(api.document.shareDocument);
  const unshareDocumentMutation = useMutation(api.document.unshareDocument);

  // Permissions available for selection
  const ALL_PERMISSIONS: PermissionType[] = [
    "view",
    "download",
    "comment",
    "edit_metadata",
    "resend",
  ];

  // Initialize selected recipients from sharedUsersData
  useEffect(() => {
    if (sharedUsersData) {
      const initialSelected = sharedUsersData.map((su) => ({
        userId: su.user._id,
        permissions: su.permissions,
      }));
      // Only set if different to avoid unnecessary re-renders
      if (JSON.stringify(initialSelected) !== JSON.stringify(selectedRecipientsWithPermissions)) {
        setSelectedRecipientsWithPermissions(initialSelected);
      }
    }
  }, [sharedUsersData]); // Removed selectedRecipientsWithPermissions from dependency array

  // Handle auto-share logic
  useEffect(() => {
    if (autoShareEnabled && documentDetails?.aiSuggestedRecipients) {
      const defaultPermissions: PermissionType[] = ["view", "download"];
      const newAISuggestedRecipients = documentDetails.aiSuggestedRecipients
        .filter(
          (aiId: Id<"users">) => !selectedRecipientsWithPermissions.some((selected) => selected.userId === aiId)
        )
        .map((aiId: Id<"users">) => ({ userId: aiId, permissions: defaultPermissions }));

      if (newAISuggestedRecipients.length > 0) {
        setSelectedRecipientsWithPermissions((prev) => [
          ...prev,
          ...newAISuggestedRecipients,
        ]);
      }
    } else if (!autoShareEnabled && documentDetails?.aiSuggestedRecipients) {
        // Option to remove AI suggested recipients if switch is turned off.
        // For now, they remain selected unless manually unselected.
    }
  }, [autoShareEnabled, documentDetails, selectedRecipientsWithPermissions]);

  // Combined list of users (shared + search results)
  const availableUsers = useMemo(() => {
    const usersMap = new Map();
    // Add shared users
    sharedUsersData?.forEach((su) => usersMap.set(su.user._id, su.user));
    // Add all users (search results or defaults)
    allUsersData?.forEach((allU) => usersMap.set(allU._id, allU));
    return Array.from(usersMap.values());
  }, [sharedUsersData, allUsersData]);

  useEffect(() => {
    // Focus the input field when modal opens
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleShare = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedRecipientsWithPermissions.map((recipient) =>
          shareDocumentMutation({
            documentId,
            recipientId: recipient.userId,
            permissions: recipient.permissions,
          })
        )
      );
      onClose();
    } catch (error) {
      console.error("Failed to share document:", error);
      // TODO: Show an error message to the user
      alert("Failed to share document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRecipient = (userId: Id<"users">) => {
    setSelectedRecipientsWithPermissions((prev) => {
      if (prev.some((r) => r.userId === userId)) {
        // Remove recipient if already selected
        return prev.filter((r) => r.userId !== userId);
      } else {
        // Add recipient with default permissions
        return [...prev, { userId, permissions: ["view", "download"] }];
      }
    });
  };

  const handleRemoveRecipient = async (userIdToRemove: Id<"users">) => {
    // Optimistically update UI
    setSelectedRecipientsWithPermissions((prev) =>
      prev.filter((r) => r.userId !== userIdToRemove)
    );
    try {
      // Check if the user was already shared (meaning they have an entry in documentShares)
      const wasAlreadyShared = sharedUsersData?.some(
        (su) => su.user._id === userIdToRemove
      );
      if (wasAlreadyShared) {
        // If they were, call unshare mutation
        await unshareDocumentMutation({
          documentId,
          recipientId: userIdToRemove,
        });
      }
    } catch (error) {
      console.error("Failed to unshare document:", error);
      // TODO: Revert UI state or show error, potentially re-add to selected if unshare fails
      alert("Failed to unshare recipient. Please try again.");
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchTerm.length > 0) {
      e.preventDefault();
      // If a single user is found by search, add them directly
      if (allUsersData?.length === 1) {
        handleToggleRecipient(allUsersData[0]._id);
        setSearchTerm(""); // Clear search
      }
    }
  };

  const isSelected = (userId: Id<"users">) =>
    selectedRecipientsWithPermissions.some((r) => r.userId === userId);

  const handlePermissionChange = (
    userId: Id<"users">,
    permission: PermissionType,
    isChecked: boolean
  ) => {
    setSelectedRecipientsWithPermissions((prev) =>
      prev.map((r) =>
        r.userId === userId
          ? {
              ...r,
              permissions: isChecked
                ? [...r.permissions, permission]
                : r.permissions.filter((p) => p !== permission),
            }
          : r
      )
    );
  };

  const getRecipientDisplay = (userId: Id<"users">) => {
    const user = availableUsers.find((u) => u._id === userId);
    return user ? user.email : "Unknown User"; // Fallback for safety
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center">
            <ShareIcon className="mr-2 h-5 w-5 text-blue-500" />
            <DialogTitle className="text-xl">แชร์เอกสาร</DialogTitle>
          </div>
          <DialogDescription className="pt-2">เลือกผู้รับเอกสาร</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-recipient" className="text-sm font-medium">
              <Mail className="h-4 w-4 inline mr-1.5" />
              ค้นหาผู้รับ
            </Label>
            <div className="flex gap-2">
              <Input
                id="search-recipient"
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="ค้นหาด้วยอีเมล"
                className="flex-1"
              />
              {/* Removed add button, direct selection from results */}
            </div>
          </div>

          {selectedRecipientsWithPermissions.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500 mb-2">ผู้รับ:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedRecipientsWithPermissions.map((recipient) => {
                  const user = availableUsers.find((u) => u._id === recipient.userId);
                  if (!user) return null; // Should not happen if availableUsers is correctly populated

                  const isCurrentlyShared = sharedUsersData?.some(
                    (su) => su.user._id === recipient.userId
                  );

                  return (
                    <div
                      key={recipient.userId}
                      className="flex flex-col border rounded-lg p-2 bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {user.name || user.email}
                        </span>
                        <button
                          onClick={() => handleRemoveRecipient(recipient.userId)}
                          className="text-red-500 hover:text-red-700"
                          title={isCurrentlyShared ? "Stop sharing" : "Remove from list"}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {ALL_PERMISSIONS.map((perm) => (
                          <label key={perm} className="flex items-center gap-1">
                            <Input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={recipient.permissions.includes(perm)}
                              onChange={(e) =>
                                handlePermissionChange(
                                  recipient.userId,
                                  perm,
                                  e.target.checked
                                )
                              }
                              disabled={isSubmitting}
                            />
                            <span>{perm}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              <Users className="h-4 w-4 inline mr-1.5" />
              ผลการค้นหา / แนะนำ
            </Label>
           {(allUsersData === undefined || sharedUsersData === undefined || (autoShareEnabled && documentDetails === undefined)) && (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Loading users...</span>
              </div>
            )}
            {availableUsers.length === 0 && searchTerm.length > 0 && (
              <p className="text-sm text-gray-500">No users found matching your search.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableUsers.map((user) => (
                <Button
                  key={user._id}
                  variant={isSelected(user._id) ? "default" : "outline"}
                  onClick={() => handleToggleRecipient(user._id)}
                  className="justify-start gap-2 h-auto py-2 px-3"
                  disabled={isSubmitting} // Disable during submission
                >
                  <Avatar className="h-6 w-6">
                    {user.name ? (
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {user.name.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    ) : (
                      <AvatarImage src="/placeholder-avatar.png" />
                    )}
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium truncate max-w-[160px]">
                      {user.name || "Unnamed User"}
                    </span>
                    <span className="text-xs truncate max-w-[160px]">
                      {user.email}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label
                htmlFor="auto-share"
                className="text-sm font-medium cursor-pointer"
              >
                ระบบการแชร์เอกสารแบบอัตโนมัติ
              </Label>
              <p className="text-xs text-muted-foreground">
                ระบบจะใช้ AI ในการเลือกผู้รับตามบริบทของผู้รับแต่ละคน
              </p>
            </div>
            <Switch
              id="auto-share"
              checked={autoShareEnabled}
              onCheckedChange={setAutoShareEnabled}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t flex-row sm:justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            ผู้รับเอกสารจะได้รับการแจ้งเตือนในระบบ
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleShare}
              disabled={selectedRecipientsWithPermissions.length === 0 || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                "Share"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
