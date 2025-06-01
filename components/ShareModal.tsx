"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { X, Plus, Users, Mail, Share as ShareIcon } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [manualRecipientInput, setManualRecipientInput] = useState("");
  const [autoShareEnabled, setAutoShareEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input field when modal opens
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleShare = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      console.log(
        "Sharing with:",
        selectedRecipients,
        "Auto enabled:",
        autoShareEnabled
      );
      setIsSubmitting(false);
      onClose();
    }, 800);
  };

  const handleAddManualRecipient = () => {
    const email = manualRecipientInput.trim();
    if (email && !selectedRecipients.includes(email)) {
      setSelectedRecipients([...selectedRecipients, email]);
      setManualRecipientInput("");
    }
  };

  const handleRemoveRecipient = (recipientToRemove: string) => {
    setSelectedRecipients(
      selectedRecipients.filter((recipient) => recipient !== recipientToRemove)
    );
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddManualRecipient();
    }
  };

  // Placeholder for recommended users - replace with actual data fetching
  const recommendedUsers = [
    {
      email: "somchai.s@cooperate.com",
      name: "สมชาย สุขสวัสดิ์",
      avatar: "",
    },
    {
      email: "pranee.r@cooperate.com", 
      name: "ปราณี รัตนชัย",
      avatar: "",
    },
    {
      email: "supachai.t@cooperate.com",
      name: "ศุภชัย ธงชัย", 
      avatar: "",
    },
  ];
  
  

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
            <Label htmlFor="manual-recipient" className="text-sm font-medium">
              <Mail className="h-4 w-4 inline mr-1.5" />
              เลือกผู้รับ
            </Label>
            <div className="flex gap-2">
              <Input
                id="manual-recipient"
                ref={inputRef}
                value={manualRecipientInput}
                onChange={(e) => setManualRecipientInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="ใส่อีเมล"
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleAddManualRecipient}
                variant="outline"
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedRecipients.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-500 mb-2">ผู้รับ:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedRecipients.map((recipient) => (
                  <Badge
                    key={recipient}
                    variant="secondary"
                    className="px-2.5 py-1 rounded-full"
                  >
                    <span className="max-w-[180px] truncate">{recipient}</span>
                    <button
                      onClick={() => handleRemoveRecipient(recipient)}
                      className="ml-1.5 hover:bg-gray-200 rounded-full p-0.5"
                      aria-label={`Remove ${recipient}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              <Users className="h-4 w-4 inline mr-1.5" />
              แนะนำ
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recommendedUsers.map((user) => (
                <Button
                  key={user.email}
                  variant={selectedRecipients.includes(user.email) ? "default" : "outline"}
                  onClick={() => {
                    if (selectedRecipients.includes(user.email)) {
                      handleRemoveRecipient(user.email);
                    } else {
                      setSelectedRecipients([...selectedRecipients, user.email]);
                    }
                  }}
                  className="justify-start gap-2 h-auto py-2 px-3"
                >
                  <Avatar className="h-6 w-6">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} />
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium truncate max-w-[160px]">
                      {user.name}
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
              <Label htmlFor="auto-share" className="text-sm font-medium cursor-pointer">
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
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t flex-row sm:justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            ผู้รับเอกสารจะได้รับการแจ้งเตือนในระบบ
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleShare}
              disabled={selectedRecipients.length === 0 || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? "Sharing..." : "แชร์"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
