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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  X,
  Users,
  Share as ShareIcon,
  Loader2,
  Sparkles,
  Check,
  Search,
  Eye,
  Download,
  Send,
  Keyboard,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type PermissionType = "view" | "download" | "resend";
type RecipientWithPermissions = {
  userId: Id<"users">;
  permissions: PermissionType[];
};
type DisplayUser = {
  _id: Id<"users">;
  name?: string | null;
  email: string;
  imageUrl?: string | null;
};

const ALL_PERMISSIONS: PermissionType[] = ["view", "download", "resend"];
const DEFAULT_PERMISSIONS: PermissionType[] = ["view", "download"];

const PERMISSION_CONFIG = {
  view: { label: "ดู", icon: Eye, color: "bg-green-500" },
  download: { label: "ดาวน์โหลด", icon: Download, color: "bg-blue-500" },
  resend: { label: "ส่งต่อ", icon: Send, color: "bg-purple-500" },
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: Id<"documents">;
}

const UserAvatar = React.memo(({ user, size = 8 }: { user: DisplayUser; size?: number }) => (
  <Avatar className={`h-${size} w-${size}`}>
    <AvatarImage src={user.imageUrl ?? undefined} />
    <AvatarFallback className="text-xs font-semibold bg-muted-foreground text-background">
      {user.name?.charAt(0)?.toUpperCase() ?? user.email.charAt(0)?.toUpperCase()}
    </AvatarFallback>
  </Avatar>
));

const PermissionButton = React.memo(
  ({
    permission,
    isActive,
    onClick,
    disabled,
  }: {
    permission: PermissionType;
    isActive: boolean;
    onClick: () => void;
    disabled: boolean;
  }) => {
    const config = PERMISSION_CONFIG[permission];
    const Icon = config.icon;
    
    return (
      <Button
        variant={isActive ? "default" : "outline"}
        size="sm"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "h-6 text-xs gap-1 px-2 py-1",
          isActive && `${config.color} hover:opacity-90`,
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Button>
    );
  },
);

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
}) => {
  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientWithPermissions[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // --- CONVEX QUERIES (stable) ---
  const sharedUsers = useQuery(api.document_sharing.getSharedUsersForDocument, { documentId });
  const documentDetails = useQuery(api.document_crud.getDocumentDetails, { documentId });
  const currentUserId = useQuery(api.users.getCurrentUserID);
  
  // Search results - only fetch when needed
  const searchResults = useQuery(
    api.users.listUsersForShare,
    searchTerm.length > 1 ? { searchQuery: searchTerm } : "skip"
  );

  // Fetch AI suggested users details
  const aiSuggestedUsers = useQuery(
    api.users.getUsersByIds,
    documentDetails?.aiSuggestedRecipients && documentDetails.aiSuggestedRecipients.length > 0
      ? { userIds: documentDetails.aiSuggestedRecipients }
      : "skip"
  );

  const shareDocument = useMutation(api.document_sharing.shareDocument);
  const unshareDocument = useMutation(api.document_sharing.unshareDocument);
  const generateAISuggestions = useAction(api.document_process.generateAiShareSuggestions);

  const userMap = useMemo(() => {
    const map = new Map<Id<"users">, DisplayUser>();
    sharedUsers?.forEach(su => map.set(su.user._id, su.user));
    searchResults?.forEach(user => map.set(user._id, user));
    aiSuggestedUsers?.forEach(user => map.set(user._id, user));
    return map;
  }, [sharedUsers, searchResults, aiSuggestedUsers]);

  const selectedUserIds = useMemo(
    () => new Set(selectedRecipients.map(r => r.userId)),
    [selectedRecipients]
  );

  useEffect(() => {
    if (sharedUsers) {
      setSelectedRecipients(
        sharedUsers.map(su => ({
          userId: su.user._id,
          permissions: su.permissions,
        }))
      );
    }
  }, [sharedUsers]);

  useEffect(() => {
    if (aiSuggestedUsers && currentUserId) {
      const aiSuggested = aiSuggestedUsers 
        .filter((user: DisplayUser) => user._id !== currentUserId && !selectedUserIds.has(user._id))
        .map((user: DisplayUser) => ({
          userId: user._id,
          permissions: DEFAULT_PERMISSIONS,
        }));
      
      if (aiSuggested.length > 0) {
        setSelectedRecipients(prev => [...prev, ...aiSuggested]);
      }
    }
  }, [aiSuggestedUsers, currentUserId, selectedUserIds]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearchTerm("");
    }
  }, [isOpen]);

  const toggleRecipient = useCallback((userId: Id<"users">) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.userId === userId);
      if (exists) {
        return prev.filter(r => r.userId !== userId);
      }
      return [...prev, { userId, permissions: DEFAULT_PERMISSIONS }];
    });
  }, []);

  const removeRecipient = useCallback(async (userId: Id<"users">) => {
    setSelectedRecipients(prev => prev.filter(r => r.userId !== userId));

    const wasShared = sharedUsers?.some(su => su.user._id === userId);
    if (wasShared) {
      try {
        await unshareDocument({ documentId, recipientId: userId });
      } catch (error) {
        console.error("Failed to unshare:", error);
      }
    }
  }, [documentId, sharedUsers, unshareDocument]);

  const updatePermissions = useCallback((userId: Id<"users">, permission: PermissionType) => {
    setSelectedRecipients(prev =>
      prev.map(r => {
        if (r.userId !== userId) return r;
        
        const hasPermission = r.permissions.includes(permission);
        return {
          ...r,
          permissions: hasPermission
            ? r.permissions.filter(p => p !== permission)
            : [...r.permissions, permission],
        };
      })
    );
  }, []);

  const handleGenerateAI = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      const suggestions = await generateAISuggestions({ documentId });
      if (suggestions?.length) {
        const newRecipients = suggestions
          .filter((id: Id<"users">) => id !== currentUserId && !selectedUserIds.has(id))
          .map((id: Id<"users">) => ({
            userId: id,
            permissions: DEFAULT_PERMISSIONS,
          }));
        
        setSelectedRecipients(prev => [...prev, ...newRecipients]);
      }
    } catch (error) {
      console.error("AI suggestions failed:", error);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [generateAISuggestions, documentId, currentUserId, selectedUserIds]);

  const handleShare = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedRecipients.map(recipient =>
          shareDocument({
            documentId,
            recipientId: recipient.userId,
            permissions: recipient.permissions,
          })
        )
      );
      onClose();
    } catch (error) {
      console.error("Share failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSearchResults = () => {
    if (searchTerm.length < 2) {
      return (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Keyboard className="h-6 w-6 mx-auto mb-1 opacity-40" />
          <p>พิมพ์อย่างน้อย 2 ตัวอักษร</p>
        </div>
      );
    }

    if (!searchResults) {
      return (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Users className="h-6 w-6 mx-auto mb-1 opacity-40" />
          <p>ไม่พบผู้ใช้</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {searchResults.map(user => {
          const isSelected = selectedUserIds.has(user._id);
          const isCurrentUser = user._id === currentUserId;
          
          return (
            <button
              key={user._id}
              type="button"
              onClick={() => !isCurrentUser && toggleRecipient(user._id)}
              disabled={isCurrentUser || isSubmitting}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                isSelected && "bg-blue-50 hover:bg-blue-100",
                isCurrentUser && "opacity-50 cursor-not-allowed"
              )}
            >
              <UserAvatar user={user} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {user.name || "Unnamed User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <div className="w-4 h-4 flex items-center justify-center">
                {isSelected ? (
                  <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSelectedRecipients = () => {
    if (selectedRecipients.length === 0) return null;

    return (
      <>
        <Separator className="my-2" />
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground px-1">
            เลือกแล้ว {selectedRecipients.length} คน
          </h4>
          {selectedRecipients.map(recipient => {
            const user = userMap.get(recipient.userId);
            if (!user) return null;

            return (
              <div
                key={recipient.userId}
                className="bg-accent/30 border rounded-lg p-2 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {user.name || "Unnamed User"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRecipient(recipient.userId)}
                    className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={isSubmitting}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {ALL_PERMISSIONS.map(permission => (
                    <PermissionButton
                      key={permission}
                      permission={permission}
                      isActive={recipient.permissions.includes(permission)}
                      onClick={() => updatePermissions(recipient.userId, permission)}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[80vh]">
        <DialogHeader className="p-3 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center text-base">
            <div className="p-1 bg-blue-500 rounded mr-2">
              <ShareIcon className="h-4 w-4 text-white" />
            </div>
            แชร์เอกสาร
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 border-b flex-shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
              className="pl-8 h-9 border-2 focus:border-blue-400"
            />
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-100 rounded">
                  <Sparkles className="h-3 w-3 text-purple-600" />
                </div>
                <span className="font-medium text-xs text-gray-900">
                  แนะนำโดย AI
                </span>
              </div>
              <Button
                onClick={handleGenerateAI}
                disabled={isSubmitting || isGeneratingAI}
                size="sm"
                variant="outline"
                className="h-6 text-xs bg-white/50"
              >
                {isGeneratingAI ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "สร้าง"
                )}
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-2">
            {renderSearchResults()}
            {renderSelectedRecipients()}
          </div>
        </ScrollArea>

        <DialogFooter className="p-3 border-t bg-gray-50/50 flex-shrink-0">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-9"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleShare}
              disabled={selectedRecipients.length === 0 || isSubmitting}
              className="flex-1 h-9"
            >
              {isSubmitting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <ShareIcon className="mr-1 h-4 w-4" />
              )}
              แชร์ ({selectedRecipients.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};