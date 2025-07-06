"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Toaster } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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

export default function SendAcrossDepPage() {
  const currentUser = useQuery(api.users.getCurrentUser);

  const userRoleAndPermissions = useQuery(
    api.users.getUserRoleAndControlledDepartments,
    currentUser?.id ? {} : "skip"
  );

  const ownedDocuments = useQuery(api.document.listOwnedDocuments);
  const allDepartments = useQuery(
    api.departments.listDepartments,
    userRoleAndPermissions == null || userRoleAndPermissions?.roleName === "Head Of Department"
      ? "skip"
      : undefined
);

const controlledDepartments = useQuery(
  api.departments.getDepartmentsByIds,
  userRoleAndPermissions == null || userRoleAndPermissions?.roleName !== "Head Of Department" || !userRoleAndPermissions.controlledDepartments
    ? "skip"
    : { departmentIds: userRoleAndPermissions.controlledDepartments }
);

const departments =
  userRoleAndPermissions == null
    ? undefined // Still loading user permissions or not found
    : userRoleAndPermissions.roleName === "Head Of Department"
      ? controlledDepartments
      : allDepartments;

  const sendToDepartmentsMutation = useMutation(
    api.document_distribution.sendToDepartments
  );

  const [selectedDocumentId, setSelectedDocumentId] = useState<
    Id<"documents"> | undefined
  >(undefined);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<
    Id<"departments">[]
  >([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  if (currentUser === undefined || userRoleAndPermissions === undefined || ownedDocuments === undefined || departments === undefined) {
    return <div>Loading...</div>;
  }

  if (!currentUser || !(userRoleAndPermissions?.permissions?.includes("document:send:department"))) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You do not have the required permissions to access this page.</p>
        <Toaster />
      </div>
    );
  }

  const handleDepartmentChange = (departmentId: Id<"departments">, checked: boolean) => {
    setSelectedDepartmentIds((prev) =>
      checked
        ? [...prev, departmentId]
        : prev.filter((id) => id !== departmentId)
    );
  };

  const handleConfirmSend = async () => {
    try {
      await sendToDepartmentsMutation({
        documentId: selectedDocumentId!,
        departmentIds: selectedDepartmentIds,
      });
      toast.success("Document sent successfully!");
      setSelectedDocumentId(undefined);
      setSelectedDepartmentIds([]);
    } catch (error) {
      console.error("Failed to send document:", error);
      toast.error(`Failed to send document: ${(error as Error).message}`);
    } finally {
      setIsConfirmModalOpen(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedDocumentId) {
      toast.error("Please select a document to send.");
      return;
    }

    if (selectedDepartmentIds.length === 0) {
      toast.error("Please select at least one department.");
      return;
    }

    setIsConfirmModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
            <header className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-10 h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6 -mx-4 md:-mx-6 lg:-mx-8">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 h-6" />
                {/* Future elements like a global search could go here */}
            </header>
            <main className="max-w-3xl mx-auto mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">
                            Send Document Across Departments
                        </CardTitle>
                        <CardDescription>
                            Choose a document and select the departments you wish to send it to.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Change: Form elements are placed within a grid layout for consistent spacing. */}
                        <div className="grid gap-6">
                            {/* --- Step 1: Select Document --- */}
                            <div className="grid gap-2">
                                <Label htmlFor="document-select" className="font-semibold">
                                    1. Select Document
                                </Label>
                                <Select
                                    onValueChange={(value: Id<"documents">) => setSelectedDocumentId(value)}
                                    value={selectedDocumentId || ""}
                                >
                                    <SelectTrigger id="document-select" className="w-full">
                                        <SelectValue placeholder="Click to select a document..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ownedDocuments?.map((doc) => (
                                            <SelectItem key={doc._id} value={doc._id}>
                                                {doc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* --- Step 2: Select Departments --- */}
                            <div className="grid gap-2">
                                <Label className="font-semibold">2. Select Departments</Label>
                                {departments.length === 0 ? (
                                    <div className="flex items-center justify-center text-sm text-muted-foreground border rounded-lg h-24">
                                        No available departments to select.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {departments.map((dep) => (
                                            <Label
                                                key={dep._id}
                                                htmlFor={`department-${dep._id}`}
                                                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors cursor-pointer"
                                            >
                                                <Checkbox
                                                    id={`department-${dep._id}`}
                                                    checked={selectedDepartmentIds.includes(dep._id)}
                                                    onCheckedChange={(checked) =>
                                                        handleDepartmentChange(dep._id, checked as boolean)
                                                    }
                                                />
                                                <span className="font-medium leading-none">
                                                    {dep.name}
                                                </span>
                                            </Label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        {/* Change: The primary action button is moved to the CardFooter.
                            This is a standard UX pattern that provides a clear end-point for the form.
                        */}
                        <Button onClick={handleSubmit} className="w-full" size="lg">
                            Send Document
                        </Button>
                    </CardFooter>
                </Card>
            </main>

            <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Document Distribution</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to send the selected document to the chosen departments? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleConfirmSend}>
                            Confirm Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Toaster />
        </div>

  );
}