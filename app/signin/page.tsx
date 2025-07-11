"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, Toaster } from "sonner";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.target as HTMLFormElement)
    formData.set("flow", "signIn")
    formData.set("redirectTo", "/dashboard")

    try {
      await signIn("password", formData);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error("กรุณาใส่อีเมลและรหัสผ่านที่ถูกต้อง");
      // console.error(error);
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
        </CardContent>

        {/* Footer */}
        {/* <p className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our{" "}
          <Button variant="link" className="px-0" asChild>
            <a href="#">Terms of Service</a>
          </Button>{" "}
          and{" "}
          <Button variant="link" className="px-0" asChild>
            <a href="#">Privacy Policy</a>
          </Button>
        </p> */}
      </Card>
    </div>
  );
}