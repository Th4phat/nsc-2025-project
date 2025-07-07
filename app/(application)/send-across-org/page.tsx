"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast, Toaster } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SendAcrossOrgPage() {
  const currentUserRole = useQuery(api.users.getUserRoleAndControlledDepartments);

  const documents = useQuery(api.document.getAllDocuments);
  const departments = useQuery(api.departments.listDepartments);

  const sendToDepartments = useMutation(api.document_distribution.sendToDepartments);
  const sendToOrganization = useMutation(api.document_distribution.sendToOrganization);

  const [selectedDocumentId, setSelectedDocumentId] = useState<Id<"documents"> | undefined>(undefined);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<Id<"departments">[]>([]);
  const [sendOption, setSendOption] = useState<"entireOrg" | "specificDepts">("entireOrg");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  if (!currentUserRole) { // Handles both undefined (loading) and null (error/no data)
    return (
      <div className="flex items-center justify-center h-full">
        <h1 className="text-2xl font-bold text-gray-500">กำลังโหลด...</h1>
      </div>
    );
  }

  if (!(currentUserRole.permissions?.includes("document:send:company"))) {
    return (
      <div className="flex items-center justify-center h-full">
        <h1 className="text-2xl font-bold text-red-500">ปฏิเสธการเข้าถึง</h1>
      </div>
    );
  }

  const handleConfirmSend = async () => {
    if (!selectedDocumentId) {
      toast.error("กรุณาเลือกเอกสาร");
      return;
    }

    try {
      if (sendOption === "entireOrg") {
        await sendToOrganization({ documentId: selectedDocumentId });
        toast.success("ส่งเอกสารไปยังทั้งองค์กรแล้ว!");
      } else if (sendOption === "specificDepts" && selectedDepartmentIds.length > 0) {
        await sendToDepartments({
          documentId: selectedDocumentId,
          departmentIds: selectedDepartmentIds,
        });
        toast.success("ส่งเอกสารไปยังแผนกที่เลือกแล้ว!");
      } else {
        toast.error("กรุณาเลือกแผนกหรือเลือกส่งไปยังทั้งองค์กร");
        return;
      }
      // Reset form
      setSelectedDocumentId(undefined);
      setSelectedDepartmentIds([]);
      setSendOption("entireOrg"); // Reset to default
    } catch (error) {
      console.error("Failed to send document:", error);
      toast.error("ส่งเอกสารไม่สำเร็จ");
    } finally {
      setIsConfirmModalOpen(false);
    }
  };

  const handleSendDocument = () => {
    if (!selectedDocumentId) {
      toast.error("กรุณาเลือกเอกสาร");
      return;
    }

    if (sendOption === "specificDepts" && selectedDepartmentIds.length === 0) {
      toast.error("กรุณาเลือกอย่างน้อยหนึ่งแผนก หรือเลือกส่งไปยังทั้งองค์กร");
      return;
    }

    setIsConfirmModalOpen(true);
  };
  const handleDepartmentChange = (departmentId: Id<"departments">, checked: boolean) => {
    setSelectedDepartmentIds((prev) =>
      checked
        ? [...prev, departmentId]
        : prev.filter((id) => id !== departmentId)
    );
  };
  return (
    <div className="p-4 md:p-6 lg:p-8">
            <header className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-10 h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6 -mx-4 md:-mx-6 lg:-mx-8">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 h-6" />
            </header>

            <main className="max-w-3xl mx-auto mt-8">
                {/* Change: The form is now encapsulated in a Card for better visual structure. */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">ส่งเอกสารทั่วทั้งองค์กร</CardTitle>
                        <CardDescription>
                            เลือกเอกสารและผู้รับเพื่อแจกจ่าย
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* --- Step 1: Document Selection --- */}
                        <div className="grid gap-2">
                            <Label htmlFor="document-select" className="font-semibold text-base">
                                1. เลือกเอกสาร
                            </Label>
                            <Select
                                onValueChange={(value) => setSelectedDocumentId(value as Id<"documents">)}
                                value={selectedDocumentId || ""}
                            >
                                <SelectTrigger id="document-select" className="w-full">
                                    <SelectValue placeholder="เลือกเอกสารที่จะส่ง..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {documents?.map((doc) => (
                                        <SelectItem key={doc._id} value={doc._id}>
                                            {doc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* --- Step 2: Recipient Options --- */}
                        <div className="grid gap-4">
                            <Label className="font-semibold text-base">
                                2. เลือกผู้รับ
                            </Label>
                            
                            {/* Major Change: Replaced the single checkbox with a RadioGroup.
                                This makes the choice between "Entire Organization" and "Specific Departments"
                                mutually exclusive and much clearer to the user.
                            */}
                            <RadioGroup
                                value={sendOption}
                                onValueChange={(value: string) => setSendOption(value as "entireOrg" | "specificDepts")}
                                className="space-y-4"
                            >
                                <Label className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted transition-colors cursor-pointer">
                                    <RadioGroupItem value="entireOrg" id="r1" />
                                    <div className="grid gap-0.5">
                                        <span className="font-semibold">ทั้งองค์กร</span>
                                        <span className="text-sm text-muted-foreground">
                                            เอกสารจะถูกส่งไปยังทุกแผนก
                                        </span>
                                    </div>
                                </Label>
                                <Label className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted transition-colors cursor-pointer">
                                    <RadioGroupItem value="specificDepts" id="r2" />
                                    <div className="grid gap-0.5">
                                        <span className="font-semibold">แผนกที่ระบุ</span>
                                        <span className="text-sm text-muted-foreground">
                                            เลือกแผนกที่จะรับเอกสารด้วยตนเอง
                                        </span>
                                    </div>
                                </Label>
                            </RadioGroup>

                            {/* Conditional rendering based on the RadioGroup's value */}
                            {sendOption === "specificDepts" && (
                                <div className="pl-4 mt-2 border-l-2">
                                     <p className="mb-3 text-sm font-medium text-muted-foreground">เลือกแผนกด้านล่าง:</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {departments?.map((dept) => (
                                            /* Change: Department checkboxes are wrapped in a clickable Label for better UX. */
                                            <Label
                                                key={dept._id}
                                                htmlFor={`dept-${dept._id}`}
                                                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors cursor-pointer text-sm"
                                            >
                                                <Checkbox
                                                    id={`dept-${dept._id}`}
                                                    checked={selectedDepartmentIds.includes(dept._id)}
                                                    onCheckedChange={(checked: boolean) => handleDepartmentChange(dept._id, checked)}
                                                />
                                                <span className="font-medium">{dept.name}</span>
                                            </Label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSendDocument} className="w-full" size="lg">
                            ส่งเอกสาร
                        </Button>
                    </CardFooter>
                </Card>
            </main>

            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ยืนยันการแจกจ่ายเอกสาร</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการส่งเอกสารที่เลือกไปยังผู้รับที่เลือกไว้? การดำเนินการนี้ไม่สามารถยกเลิกได้
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">ยกเลิก</Button>
                        </DialogClose>
                        <Button onClick={handleConfirmSend}>
                            ยืนยันการส่ง
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Toaster />
        </div>
  );
}