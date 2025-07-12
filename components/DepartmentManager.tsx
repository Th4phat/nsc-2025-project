"use client";

import { useState } from "react";
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
import { DialogDescription } from "@radix-ui/react-dialog";

interface Department {
  _id: Id<"departments">;
  name: string;
  description?: string;
}

export function DepartmentManager() {
  const departments = useQuery(api.department_management.listDepartments);
  const createDepartment = useMutation(api.department_management.createDepartment);
  const updateDepartment = useMutation(api.department_management.updateDepartment);
  const deleteDepartment = useMutation(api.department_management.deleteDepartment);
  const archiveDepartment = useMutation(api.department_management.archiveDepartment);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleAddClick = () => {
    setCurrentDepartment(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleEditClick = (department: Department) => {
    setCurrentDepartment(department);
    setName(department.name);
    setDescription(department.description || "");
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: Id<"departments">) => {
    if (window.confirm("ยืนยันการลบ?")) {
      await deleteDepartment({ id });
    }
    
  };

  // const handleArchiveClick = async (id: Id<"departments">) => {
  //   if (window.confirm("ยืนยันการ archive?")) {
  //   await archiveDepartment({ id });
  //   }
  // };

  const handleSubmit = async () => {
    if (currentDepartment) {
      await updateDepartment({
        id: currentDepartment._id,
        name,
        description: description || undefined,
      });
    } else {
      await createDepartment({
        name,
        description: description || undefined,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">จัดการแผนก</h2>
        <Button onClick={handleAddClick}>เพิ่มแผนก</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อ</TableHead>
            <TableHead>คำอธิบาย</TableHead>
            <TableHead className="text-right">กระทำ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments?.map((department) => (
            <TableRow key={department._id}>
              <TableCell className="font-medium">{department.name}</TableCell>
              <TableCell>{department.description}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  onClick={() => handleEditClick(department)}
                >
                  แก้ไข
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  onClick={() => handleArchiveClick(department._id)}
                >
                  เก็บ
                </Button> */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(department._id)}
                >
                  ลบ
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentDepartment ? "แก้ไขข้อมูลแผนก" : "เพิ่มแผนกใหม่"}
            </DialogTitle>
            <DialogDescription>
              
            </DialogDescription>
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
              <Label htmlFor="description" className="text-right">
                คำอธิบาย
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit}>
              {currentDepartment ? "บันทึก" : "เพิ่มแผนกใหม่"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}