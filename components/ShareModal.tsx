"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  X,
  Users,
  Mail,
  Share as ShareIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "./ui/scroll-area";

// --- TYPE DEFINITIONS ---
type PermissionType =
  | "view"
  | "download"
  | "comment"
  | "edit_metadata"
  | "resend";

type RecipientWithPermissions = {
  userId: Id<"users">;
  permissions: PermissionType[];
};

// --- FIX: Define a common user type for display purposes ---
// This type includes only the fields needed by the sub-components,
// resolving the conflict between the full Doc<"users"> and the partial
// user object from the search query.
type DisplayUser = {
  _id: Id<"users">;
  name?: string | null;
  email: string;
  imageUrl?: string | null;
};

// --- CONSTANTS ---
const ALL_PERMISSIONS: PermissionType[] = [
  "view",
  "download",
  "comment",
  "edit_metadata",
  "resend",
];
const DEFAULT_PERMISSIONS: PermissionType[] = ["view", "download"];

// --- PROPS INTERFACES ---
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: Id<"documents">;
}

interface SelectedRecipientProps {
  user: DisplayUser; // FIX: Use the common DisplayUser type
  recipient: RecipientWithPermissions;
  onRemove: (userId: Id<"users">) => void;
  onPermissionChange: (
    userId: Id<"users">,
    permission: PermissionType,
    isChecked: boolean,
  ) => void;
  isSubmitting: boolean;
}

interface UserSuggestionItemProps {
  user: DisplayUser; // FIX: Use the common DisplayUser type
  isSelected: boolean;
  onToggle: (userId: Id<"users">) => void;
  isSubmitting: boolean;
}

interface AiSuggestionSectionProps {
  onGenerate: () => void;
  isGenerating: boolean;
  isSubmitting: boolean;
}

// --- MEMOIZED SUB-COMPONENTS ---

const SelectedRecipient = React.memo(
  ({
    user,
    recipient,
    onRemove,
    onPermissionChange,
    isSubmitting,
  }: SelectedRecipientProps) => (
    <div className="flex flex-col border rounded-lg p-2 bg-white shadow-sm w-full">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{user.name || user.email}</span>
        <button
          onClick={() => onRemove(recipient.userId)}
          className="text-red-500 hover:text-red-700"
          title="Remove recipient"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {ALL_PERMISSIONS.map(perm => (
          <label key={perm} className="flex items-center gap-1.5">
            <Input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={recipient.permissions.includes(perm)}
              onChange={e =>
                onPermissionChange(recipient.userId, perm, e.target.checked)
              }
              disabled={isSubmitting}
            />
            <span className="capitalize">{perm.replace("_", " ")}</span>
          </label>
        ))}
      </div>
    </div>
  ),
);

const UserSuggestionItem = React.memo(
  ({ user, isSelected, onToggle, isSubmitting }: UserSuggestionItemProps) => (
    <Button
      variant={isSelected ? "default" : "outline"}
      onClick={() => onToggle(user._id)}
      className="justify-start gap-2 h-auto py-2 px-3"
      disabled={isSubmitting}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.imageUrl ?? undefined} />
        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
          {user.name?.charAt(0) ?? "?"}
        </AvatarFallback>
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
  ),
);

const AiSuggestionSection = React.memo(
  ({ onGenerate, isGenerating, isSubmitting }: AiSuggestionSectionProps) => (
    <div className="pt-4 border-t">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-0.5">
          <Label
            htmlFor="generate-ai-suggestions"
            className="text-sm font-medium"
          >
            แนะนำผู้รับโดย AI
          </Label>
          <p className="text-xs text-muted-foreground">
            ให้ AI เป็นคนเลือกผู้รับเอกสารให้คุณสิ!
          </p>
        </div>
        <Button
          id="generate-ai-suggestions"
          variant="outline"
          onClick={onGenerate}
          disabled={isSubmitting || isGenerating}
          className="w-full sm:w-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังทำงาน...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              เลือกผู้รับ
            </>
          )}
        </Button>
      </div>
    </div>
  ),
);

// --- MAIN COMPONENT ---

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  // --- STATE AND REFS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [
    selectedRecipientsWithPermissions,
    setSelectedRecipientsWithPermissions,
  ] = useState<RecipientWithPermissions[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- CONVEX DATA FETCHING ---
  const sharedUsersData = useQuery(
    api.document_sharing.getSharedUsersForDocument,
    { documentId },
  );
  const allUsersData = useQuery(api.users.listUsersForShare, {
    searchQuery: searchTerm.length > 0 ? searchTerm : undefined,
  });
  const documentDetails = useQuery(api.document_crud.getDocumentDetails, {
    documentId,
  });

  // --- CONVEX MUTATIONS AND ACTIONS ---
  const shareDocumentMutation = useMutation(api.document_sharing.shareDocument);
  const unshareDocumentMutation = useMutation(
    api.document_sharing.unshareDocument,
  );
  const generateAiSuggestionsMutation = useAction(
    api.document_process.generateAiShareSuggestions,
  );

  // --- MEMOIZED DATA ---
  const availableUsers = useMemo(() => {
    // FIX: Use a map of the common `DisplayUser` type.
    const usersMap = new Map<Id<"users">, DisplayUser>();

    // Add users who are already shared. `su.user` is a full Doc and
    // is compatible with DisplayUser.
    sharedUsersData?.forEach(su => usersMap.set(su.user._id, su.user));

    // Add users from search results. `allU` is the partial user object
    // that is also compatible with DisplayUser.
    allUsersData?.forEach(allU => {
      if (!usersMap.has(allU._id)) {
        usersMap.set(allU._id, allU);
      }
    });

    return Array.from(usersMap.values());
  }, [sharedUsersData, allUsersData]);

  // --- EFFECTS ---
  useEffect(() => {
    if (sharedUsersData) {
      const initialSelected = sharedUsersData.map(su => ({
        userId: su.user._id,
        permissions: su.permissions,
      }));
      setSelectedRecipientsWithPermissions(initialSelected);
    }
  }, [sharedUsersData]);

  useEffect(() => {
    if (
      documentDetails?.aiSuggestedRecipients &&
      Array.isArray(documentDetails.aiSuggestedRecipients)
    ) {
      setSelectedRecipientsWithPermissions(prev => {
        const existingIds = new Set(prev.map(r => r.userId));
        const newAISuggestedRecipients = (
          documentDetails.aiSuggestedRecipients ?? []
        )
          .filter((aiId: Id<"users">) => !existingIds.has(aiId))
          .map((aiId: Id<"users">) => ({
            userId: aiId,
            permissions: DEFAULT_PERMISSIONS,
          }));
        return [...prev, ...newAISuggestedRecipients];
      });
    }
  }, [documentDetails?.aiSuggestedRecipients]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // --- MEMOIZED HANDLERS ---
  const handleToggleRecipient = useCallback((userId: Id<"users">) => {
    setSelectedRecipientsWithPermissions(prev => {
      const isAlreadySelected = prev.some(r => r.userId === userId);
      if (isAlreadySelected) {
        return prev.filter(r => r.userId !== userId);
      } else {
        return [...prev, { userId, permissions: DEFAULT_PERMISSIONS }];
      }
    });
  }, []);

  const handleRemoveRecipient = useCallback(
    async (userIdToRemove: Id<"users">) => {
      setSelectedRecipientsWithPermissions(prev =>
        prev.filter(r => r.userId !== userIdToRemove),
      );
      try {
        const wasAlreadyShared = sharedUsersData?.some(
          su => su.user._id === userIdToRemove,
        );
        if (wasAlreadyShared) {
          await unshareDocumentMutation({
            documentId,
            recipientId: userIdToRemove,
          });
        }
      } catch (error) {
        console.error("Failed to unshare document:", error);
        alert("Failed to unshare recipient. Please try again.");
      }
    },
    [documentId, sharedUsersData, unshareDocumentMutation],
  );

  const handlePermissionChange = useCallback(
    (
      userId: Id<"users">,
      permission: PermissionType,
      isChecked: boolean,
    ) => {
      setSelectedRecipientsWithPermissions(prev =>
        prev.map(r =>
          r.userId === userId
            ? {
                ...r,
                permissions: isChecked
                  ? [...r.permissions, permission]
                  : r.permissions.filter(p => p !== permission),
              }
            : r,
        ),
      );
    },
    [],
  );

  const handleGenerateAiSuggestions = useCallback(async () => {
    setIsGeneratingSuggestions(true);
    try {
      const suggestedIds = await generateAiSuggestionsMutation({ documentId });
      if (suggestedIds && suggestedIds.length > 0) {
        setSelectedRecipientsWithPermissions(prevSelected => {
          const existingIds = new Set(prevSelected.map(r => r.userId));
          const newRecipients = suggestedIds
            .filter((id: Id<"users">) => !existingIds.has(id))
            .map((id: Id<"users">) => ({
              userId: id,
              permissions: DEFAULT_PERMISSIONS,
            }));
          return [...prevSelected, ...newRecipients];
        });
      }
    } catch (error) {
      console.error("Failed to generate AI suggestions:", error);
      alert("Failed to generate AI suggestions. Please try again.");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [generateAiSuggestionsMutation, documentId]);

  const handleShare = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedRecipientsWithPermissions.map(recipient =>
          shareDocumentMutation({
            documentId,
            recipientId: recipient.userId,
            permissions: recipient.permissions,
          }),
        ),
      );
      onClose();
    } catch (error) {
      console.error("Failed to share document:", error);
      alert("Failed to share document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      searchTerm.length > 0 &&
      allUsersData?.length === 1
    ) {
      e.preventDefault();
      handleToggleRecipient(allUsersData[0]._id);
      setSearchTerm("");
    }
  };

  const isSelected = (userId: Id<"users">) =>
    selectedRecipientsWithPermissions.some(r => r.userId === userId);

  // --- RENDER ---
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center">
            <ShareIcon className="mr-2 h-5 w-5 text-blue-500" />
            <DialogTitle className="text-xl">แชร์เอกสาร</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            เลือกผู้รับเอกสาร
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-recipient" className="text-sm font-medium">
              <Mail className="h-4 w-4 inline mr-1.5" />
              ค้นหาผู้รับ
            </Label>
            <Input
              id="search-recipient"
              ref={inputRef}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="ค้นหาด้วยอีเมล"
            />
          </div>

          {selectedRecipientsWithPermissions.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500 mb-2">ผู้รับ:</p>
              <div className="flex flex-wrap gap-2">
                <ScrollArea className="h-40 rounded-md whitespace-nowrap">
                {selectedRecipientsWithPermissions.map(recipient => {
                  const user = availableUsers.find(
                    u => u._id === recipient.userId,
                  );
                  if (!user) return null;
                  return (
                    <SelectedRecipient
                      key={recipient.userId}
                      user={user}
                      recipient={recipient}
                      onRemove={handleRemoveRecipient}
                      onPermissionChange={handlePermissionChange}
                      isSubmitting={isSubmitting}
                    />
                  );
                })}
                </ScrollArea>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              <Users className="h-4 w-4 inline mr-1.5" />
              ผลการค้นหา / แนะนำ
            </Label>
            {(allUsersData === undefined || sharedUsersData === undefined) && (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Loading users...</span>
              </div>
            )}
            {availableUsers.length === 0 && searchTerm.length > 0 && (
              <p className="text-sm text-gray-500">
                No users found matching your search.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableUsers.map(user => (
                <UserSuggestionItem
                  key={user._id}
                  user={user}
                  isSelected={isSelected(user._id)}
                  onToggle={handleToggleRecipient}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          </div>

          <AiSuggestionSection
            onGenerate={handleGenerateAiSuggestions}
            isGenerating={isGeneratingSuggestions}
            isSubmitting={isSubmitting}
          />
        </div>

        <DialogFooter className="pt-4 border-t flex-col sm:flex-row sm:justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            ผู้รับเอกสารจะได้รับการแจ้งเตือนในระบบ
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleShare}
              disabled={
                selectedRecipientsWithPermissions.length === 0 || isSubmitting
              }
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังแชร์...
                </>
              ) : (
                "แชร์"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};