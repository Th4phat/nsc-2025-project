"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, Toaster } from "sonner";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const users = [
    { email: "admin@test.com", password: "12345678", role: "แอดมิน" },
    { email: "director@test.com", password: "12345678", role: "ผู้อำนวยการ" },
    { email: "hod@test.com", password: "12345678", role: "หัวหน้าแผนก" },
    { email: "employee@test.com", password: "12345678", role: "พนักงาน" },
    { email: "employee2@test.com", password: "12345678", role: "พนักงาน" },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.target as HTMLFormElement)
    formData.set("flow", "signIn")
    formData.set("redirectTo", "/dashboard")

    try {
      await signIn("password", formData);
      router.push("/dashboard");
    } catch (_) {
      toast.error("กรุณาใส่อีเมลและรหัสผ่านที่ถูกต้อง");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Toaster richColors/>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mx-auto">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">
            ยินดีต้อนรับ
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            เข้าสู่ระบบเพื่อเข้าหน้าแดชบอร์ด
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมลองค์กร</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="ป้อนอีเมลตรงนี้..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="ใส่รหัสผ่านตรงนี้..."
                  className="pl-10 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>เข้าสู่ระบบ</>
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
          <Button variant="link" className="px-0" asChild>
            <a href="/disclaimer">Disclaimer (ข้อตกลงการใช้ซอฟท์แวร์)</a>
          </Button>{" "}
        </p>
        </CardContent>

        <CardFooter className="pt-4">
          <div className="w-full text-sm text-muted-foreground">
            <h4 className="font-semibold mb-2">ชื่อผู้ใช้และรหัสผ่านสำหรับการทดสอบ:</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left table-auto">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b">อีเมล</th>
                    <th className="px-2 py-1 border-b">รหัสผ่าน</th>
                    <th className="px-2 py-1 border-b">บทบาท</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index}>
                      <td className="px-2 py-1">{user.email}</td>
                      <td className="px-2 py-1">{user.password}</td>
                      <td className="px-2 py-1">{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardFooter>

        
      </Card>
    </div>
  );
}