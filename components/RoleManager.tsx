"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Role {
  _id: Id<"roles">;
  name: string;
  rank: number;
  permissions: string[];
}

// Dummy list of all possible permissions (replace with actual permissions from your system)
const ALL_PERMISSIONS = [
  "profile:read:own",
  "profile:update:own",
  "inbox:read:own",
  "announcement:read:department",
  "announcement:read:company",
  "document:send:department",
  "user:list:department",
  "document:send:company",
  "user:list:company",
  "user:create",
  "user:read:any",
  "user:update:any",
  "user:delete:any",
  "system:logs:read",
  "system:settings:read",
  "system:settings:update",
];

export function RoleManager() {
  const roles = useQuery(api.role_management.listAllRoles);
  const createRole = useMutation(api.role_management.createRole);
  const updateRole = useMutation(api.role_management.updateRole);
  const deleteRole = useMutation(api.role_management.deleteRole);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [rank, setRank] = useState<number>(0);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (currentRole) {
      setName(currentRole.name);
      setRank(currentRole.rank);
      setSelectedPermissions(currentRole.permissions);
    } else {
      setName("");
      setRank(0);
      setSelectedPermissions([]);
    }
  }, [currentRole]);

  const handleAddClick = () => {
    setCurrentRole(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (role: Role) => {
    setCurrentRole(role);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: Id<"roles">) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      try {
        await deleteRole({ id });
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setSelectedPermissions((prev) =>
      checked ? [...prev, permission] : prev.filter((p) => p !== permission),
    );
  };

  const handleSubmit = async () => {
    if (currentRole) {
      await updateRole({
        id: currentRole._id,
        name,
        rank,
        permissions: selectedPermissions,
      });
    } else {
      await createRole({
        name,
        rank,
        permissions: selectedPermissions,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">จัดการบทบาท</h2>
        <Button onClick={handleAddClick}>เพิ่มบทบาท</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อ</TableHead>
            <TableHead>ระดับ</TableHead>
            <TableHead>สิทธิ</TableHead>
            <TableHead className="text-right">กระทำ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles?.map((role) => (
            <TableRow key={role._id}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell>{role.rank}</TableCell>
              <TableCell>
                <ScrollArea className="h-20 w-48 rounded-md border p-2">
                  {role.permissions.length > 0 ? (
                    role.permissions.map((p) => (
                      <div key={p} className="text-sm">
                        {p}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">ไม่มีสิทธิ</div>
                  )}
                </ScrollArea>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  onClick={() => handleEditClick(role)}
                >
                  แก้ไข
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(role._id)}
                >
                  ลบ
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentRole ? "แก้ไขบทบาท" : "เพิ่มบทบาท"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                ชื่อ
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rank" className="text-right">
                ระดับ
              </Label>
              <Input
                id="rank"
                type="number"
                value={rank}
                onChange={(e) => setRank(parseInt(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="permissions" className="text-right">
                สิทธิ
              </Label>
              <div className="col-span-3 grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={selectedPermissions.includes(permission)}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(permission, checked as boolean)
                      }
                    />
                    <Label htmlFor={permission}>{permission}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit}>
              {currentRole ? "บันทึก" : "เพิ่มบทบาท"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}