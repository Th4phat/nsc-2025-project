"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useEffect } from "react";

import { Button } from "../../../components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import { Checkbox } from "../../../components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface User {
    _id: Id<"users">;
    name?: string;
    email: string;
    bio?: string;
    departmentId?: Id<"departments">;
    departmentName?: string;
    roleId?: Id<"roles">;
    roleName?: string;
    controlledDepartments?: Id<"departments">[];
}


interface Role {
    _id: Id<"roles">;
    name: string;
}

export default function ManageUserPage() {
    const permissions = useQuery(api.users.getMyPermissions);
    const users = useQuery(api.user_management.getUsers);
    const departments = useQuery(api.departments.listDepartments);
    const roles = useQuery(api.roles.listRoles);

    const updateUserMutation = useMutation(api.user_management.updateUser);
    const updateControlledDepartmentsMutation = useMutation(
        api.user_management.updateControlledDepartments,
    );

    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
    const [isManageDepartmentsDialogOpen, setIsManageDepartmentsDialogOpen] =
        useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        bio: "",
        departmentId: "",
        roleId: "",
    });
    const [controlledDepartments, setControlledDepartments] = useState<
        Id<"departments">[]
    >([]);

    useEffect(() => {
        if (selectedUser) {
            setEditFormData({
                name: selectedUser.name || "",
                bio: selectedUser.bio || "",
                departmentId: selectedUser.departmentId || "",
                roleId: selectedUser.roleId || "",
            });
            setControlledDepartments(selectedUser.controlledDepartments || []);
        }
    }, [selectedUser]);

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsEditUserDialogOpen(true);
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setEditFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: string, value: string) => {
        setEditFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;

        await updateUserMutation({
            userId: selectedUser._id,
            name: editFormData.name,
            bio: editFormData.bio,
            departmentId: editFormData.departmentId as Id<"departments"> || undefined,
            roleId: editFormData.roleId as Id<"roles"> || undefined,
        });
        setIsEditUserDialogOpen(false);
    };

    const handleManageDepartmentsClick = () => {
        setIsEditUserDialogOpen(false); // Close the first dialog
        setIsManageDepartmentsDialogOpen(true);
    };

    const handleControlledDepartmentChange = (departmentId: Id<"departments">, checked: boolean) => {
        setControlledDepartments((prev) =>
            checked
                ? [...prev, departmentId]
                : prev.filter((id) => id !== departmentId),
        );
    };

    const handleUpdateControlledDepartments = async () => {
        if (!selectedUser) return;

        await updateControlledDepartmentsMutation({
            userId: selectedUser._id,
            controlledDepartments: controlledDepartments,
        });
        setIsManageDepartmentsDialogOpen(false);
    };

    if (permissions === undefined || users === undefined || departments === undefined || roles === undefined) {
        return <div>Loading...</div>;
    }

    if (!permissions.includes("user:read:any")) {
        return (
            <div className="flex items-center justify-center h-screen text-red-500 text-xl">
                Access Denied: You do not have permission to view this page.
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            {/* --- Header --- */}
            {/* The sticky header remains for navigation controls. */}
            <header className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-10 h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 h-6" />
                {/* Future elements like a global search could go here */}
                
            </header>

            {/* --- Main Content Area --- */}
            <main className="p-4 md:p-6">
                {/* Change: The main content is now wrapped in a Card component. 
                  This provides better visual structure, elevation, and encapsulation 
                  compared to a simple div with borders.
                */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Manage Users</CardTitle>
                        <CardDescription>
                            View, edit, and manage user roles and permissions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Change: Replaced the div-based grid with the shadcn/ui Table component.
                          This is semantically correct for tabular data, more accessible, and provides
                          superior styling out-of-the-box (e.g., proper spacing, subtle row dividers).
                        */}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    /* Change: The "No users" message is now part of the table body for a cleaner look. */
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user._id}>
                                            <TableCell className="font-medium">
                                                {user.name || "N/A"}
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.departmentName || "N/A"}</TableCell>
                                            <TableCell>{user.roleName || "N/A"}</TableCell>
                                            <TableCell className="text-right">
                                                {/* Change: Encapsulated actions in a div for potential future additions (e.g., a "Delete" button dropdown) */}
                                                <div>
                                                    <Button onClick={() => handleEditClick(user)} size="sm">
                                                        Edit
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>

            {/* --- Dialogs (Modals) --- */}
            {/* The dialogs were already well-structured using shadcn/ui components. No major UI changes were needed here. */}

            {/* Edit User Dialog */}
            {selectedUser && (
                <Dialog
                    open={isEditUserDialogOpen}
                    onOpenChange={setIsEditUserDialogOpen}
                >
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                                Make changes to {selectedUser.name || selectedUser.email}'s profile. Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    name="name" // Added name attribute for consistency
                                    value={editFormData.name}
                                    onChange={handleEditFormChange}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bio" className="text-right">
                                    Bio
                                </Label>
                                <Textarea
                                    id="bio"
                                    name="bio" // Added name attribute for consistency
                                    value={editFormData.bio}
                                    onChange={handleEditFormChange}
                                    className="col-span-3"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="departmentId" className="text-right">
                                    Department
                                </Label>
                                <Select
                                    onValueChange={(value) => handleSelectChange("departmentId", value)}
                                    value={editFormData.departmentId}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments?.map((dept) => (
                                            <SelectItem key={dept._id} value={dept._id}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="roleId" className="text-right">
                                    Role
                                </Label>
                                <Select
                                    onValueChange={(value) => handleSelectChange("roleId", value)}
                                    value={editFormData.roleId}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles?.map((role) => (
                                            <SelectItem key={role._id} value={role._id}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            {selectedUser.roleName === "Head of Department" && (
                                <Button
                                    variant="outline"
                                    onClick={handleManageDepartmentsClick}
                                    className="mr-auto"
                                >
                                    Manage Controlled Depts.
                                </Button>
                            )}
                            <Button onClick={handleUpdateUser}>Save changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Manage Controlled Departments Dialog */}
            {selectedUser && (
                <Dialog
                    open={isManageDepartmentsDialogOpen}
                    onOpenChange={setIsManageDepartmentsDialogOpen}
                >
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Manage Controlled Departments</DialogTitle>
                            <DialogDescription>
                                Select departments that {selectedUser.name || selectedUser.email} can control.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {departments?.map((dept) => (
                                <div key={dept._id} className="flex items-center space-x-3">
                                    <Checkbox
                                        id={`dept-${dept._id}`}
                                        checked={controlledDepartments.includes(dept._id)}
                                        onCheckedChange={(checked) =>
                                            handleControlledDepartmentChange(dept._id, checked as boolean)
                                        }
                                    />
                                    <Label
                                        htmlFor={`dept-${dept._id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {dept.name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button onClick={handleUpdateControlledDepartments}>Save changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}