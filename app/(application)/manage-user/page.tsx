"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";

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

export default function ManageUserPage() {
    const permissions = useQuery(api.users.getMyPermissions);
    const [searchInput, setSearchInput] = useState("");
    const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
    const users = useQuery(api.user_management.getUsers, { query: submittedSearchQuery });
    const departments = useQuery(api.departments.listDepartments);
    const roles = useQuery(api.roles.listRoles);

    const updateUserMutation = useMutation(api.user_management.updateUser);
    const updateControlledDepartmentsMutation = useMutation(
        api.user_management.updateControlledDepartments,
    );
    const createUserMutation = useMutation(api.user_management.createUser);
    const batchCreateUsersAction = useAction(api.user_management.batchCreateUsers);
    const deleteUserMutation = useMutation(api.user_management.deleteUser);

    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
    const [isManageDepartmentsDialogOpen, setIsManageDepartmentsDialogOpen] =
        useState(false);
    const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
    const [isBatchCreateUserDialogOpen, setIsBatchCreateUserDialogOpen] = useState(false);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState({
        name: "",
        bio: "",
        departmentId: "",
        roleId: "",
    });
    const [newUserData, setNewUserData] = useState({
        name: "",
        email: "",
        password: "",
        departmentId: "",
        roleId: "",
    });
    const [controlledDepartments, setControlledDepartments] = useState<
        Id<"departments">[]
    >([]);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleDeleteUser = async (userId: Id<"users">) => {
        if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?")) {
            try {
                await deleteUserMutation({ userId });
                alert("ผู้ใช้ถูกลบเรียบร้อยแล้ว!");
            } catch (error) {
                alert(`เกิดข้อผิดพลาดในการลบผู้ใช้: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsEditUserDialogOpen(true);
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setEditFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleNewUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setNewUserData((prev) => ({ ...prev, [id]: value }));
    };

    const handleCreateUser = async () => {
        if (!newUserData.name || !newUserData.email || !newUserData.password || !newUserData.departmentId || !newUserData.roleId) {
            alert("Please fill all fields.");
            return;
        }
        try {
            await createUserMutation({
                name: newUserData.name,
                email: newUserData.email,
                password: newUserData.password,
                departmentId: newUserData.departmentId as Id<"departments">,
                roleId: newUserData.roleId as Id<"roles">,
            });
            alert("User created successfully!");
            setIsCreateUserDialogOpen(false);
            setNewUserData({ name: "", email: "", password: "", departmentId: "", roleId: "" });
        } catch (error) {
            alert(`Error creating user: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCsvFile(file);
        }
    };

    const handleBatchCreateUsers = async () => {
        if (!csvFile) {
            alert("Please select a CSV file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csvData = e.target?.result as string;
            try {
                await batchCreateUsersAction({ csvData });
                alert("Users batch created successfully!");
                setIsBatchCreateUserDialogOpen(false);
                setCsvFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            } catch (error) {
                alert(`Error batch creating users: ${error instanceof Error ? error.message : String(error)}`);
            }
        };
        reader.readAsText(csvFile);
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
        return <div className="flex items-center justify-center h-full">
        <h1 className="text-2xl font-bold text-gray-500">กำลังโหลด...</h1>
      </div>
    }

    if (!permissions.includes("user:read:any")) {
        return (
            <div className="flex items-center justify-center h-screen text-red-500 text-xl">
                ปฏิเสธการเข้าถึง: คุณไม่มีสิทธิ์ในการดูหน้านี้
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            {/* --- Header --- */}
            {/* The sticky header remains for navigation controls. */}
            <header className="flex sticky top-0 bg-background/95 backdrop-blur-sm z-10 h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-6" />
          </header>

            {/* --- Main Content Area --- */}
            <main className="p-4 md:p-6">
                {/* Change: The main content is now wrapped in a Card component. 
                  This provides better visual structure, elevation, and encapsulation 
                  compared to a simple div with borders.
                */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold flex justify-between items-center">
                            จัดการผู้ใช้
                            <div className="flex items-center gap-2">
                                <Input
                                    type="text"
                                    placeholder="ค้นหาผู้ใช้..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button onClick={() => setSubmittedSearchQuery(searchInput)} size="sm" variant="outline">
                                    ค้นหา
                                </Button>
                                {permissions.includes("user:create") && (
                                    <div className="flex gap-2">
                                        <Button onClick={() => setIsCreateUserDialogOpen(true)} size="sm">
                                            สร้างผู้ใช้
                                        </Button>
                                        {/* <Button onClick={() => setIsBatchCreateUserDialogOpen(true)} size="sm" variant="outline">
                                            นำเข้าจาก CSV
                                        </Button> */}
                                    </div>
                                )}
                            </div>
                        </CardTitle>
                        <CardDescription>
                            ดู แก้ไข และจัดการบทบาทและสิทธิ์ของผู้ใช้
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
                                    <TableHead className="w-[200px]">ชื่อ</TableHead>
                                    <TableHead>อีเมล</TableHead>
                                    <TableHead>แผนก</TableHead>
                                    <TableHead>บทบาท</TableHead>
                                    <TableHead className="text-right">การดำเนินการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    /* Change: The "No users" message is now part of the table body for a cleaner look. */
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            ไม่พบผู้ใช้
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user._id}>
                                            <TableCell className="font-medium">
                                                {user.name || "ไม่มี"}
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.departmentName || "ไม่มี"}</TableCell>
                                            <TableCell>{user.roleName || "ไม่มี"}</TableCell>
                                            <TableCell className="text-right">
                                                {/* Change: Encapsulated actions in a div for potential future additions (e.g., a "Delete" button dropdown) */}
                                                <div>
                                                    <Button onClick={() => handleEditClick(user)} size="sm">
                                                        แก้ไข
                                                    </Button>
                                                    {permissions.includes("user:delete:any") && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            className="ml-2"
                                                        >
                                                            ลบ
                                                        </Button>
                                                    )}
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
                            <DialogTitle>แก้ไขผู้ใช้</DialogTitle>
                            <DialogDescription>
                                ทำการเปลี่ยนแปลงโปรไฟล์ของ {selectedUser.name || selectedUser.email} เมื่อเสร็จแล้วคลิกบันทึก
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    ชื่อ
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
                                    ประวัติ
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
                                    แผนก
                                </Label>
                                <Select
                                    onValueChange={(value) => handleSelectChange("departmentId", value)}
                                    value={editFormData.departmentId}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="เลือกแผนก" />
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
                                    บทบาท
                                </Label>
                                <Select
                                    onValueChange={(value) => handleSelectChange("roleId", value)}
                                    value={editFormData.roleId}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="เลือกบทบาท" />
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
                            
                                <Button
                                    variant="outline"
                                    onClick={handleManageDepartmentsClick}
                                    className="mr-auto"
                                >
                                    จัดการแผนกที่ควบคุม
                                </Button>
                            
                            <Button onClick={handleUpdateUser}>บันทึกการเปลี่ยนแปลง</Button>
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
                            <DialogTitle>จัดการแผนกที่ควบคุม</DialogTitle>
                            <DialogDescription>
                                เลือกแผนกที่ {selectedUser.name || selectedUser.email} สามารถควบคุมได้
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
                            <Button onClick={handleUpdateControlledDepartments}>บันทึกการเปลี่ยนแปลง</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Create User Dialog */}
            <Dialog
                open={isCreateUserDialogOpen}
                onOpenChange={setIsCreateUserDialogOpen}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>สร้างผู้ใช้ใหม่</DialogTitle>
                        <DialogDescription>
                            กรอกรายละเอียดเพื่อสร้างผู้ใช้ใหม่
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                ชื่อ
                            </Label>
                            <Input
                                id="name"
                                value={newUserData.name}
                                onChange={handleNewUserFormChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                อีเมล
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={newUserData.email}
                                onChange={handleNewUserFormChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                รหัสผ่าน
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={newUserData.password}
                                onChange={handleNewUserFormChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="departmentId" className="text-right">
                                แผนก
                            </Label>
                            <Select
                                onValueChange={(value) => setNewUserData((prev) => ({ ...prev, departmentId: value }))}
                                value={newUserData.departmentId}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="เลือกแผนก" />
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
                                บทบาท
                            </Label>
                            <Select
                                onValueChange={(value) => setNewUserData((prev) => ({ ...prev, roleId: value }))}
                                value={newUserData.roleId}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="เลือกบทบาท" />
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
                        <Button onClick={handleCreateUser}>สร้าง</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Create User Dialog */}
            <Dialog
                open={isBatchCreateUserDialogOpen}
                onOpenChange={setIsBatchCreateUserDialogOpen}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>นำเข้าผู้ใช้จาก CSV</DialogTitle>
                        <DialogDescription>
                            อัปโหลดไฟล์ CSV เพื่อสร้างผู้ใช้จำนวนมาก
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="csvFile" className="text-right">
                                ไฟล์ CSV
                            </Label>
                            <Input
                                id="csvFile"
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="col-span-3"
                                ref={fileInputRef}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleBatchCreateUsers} disabled={!csvFile}>
                            นำเข้า
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}