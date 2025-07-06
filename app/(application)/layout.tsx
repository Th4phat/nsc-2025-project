import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ApplicationLayout } from "./components/ApplicationLayout";
import type { Metadata } from "next";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Geist, Geist_Mono } from "next/font/google";

export const metadata: Metadata = {
  title: "แดชบอร์ด",
  description: "หน้าแดชบอร์ด",
  icons: {
    icon: "/convex.svg",
  },
};
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>

        <div
          className={`antialiased`}
        >
          <ConvexClientProvider>

              <ApplicationLayout>{children}</ApplicationLayout>

          </ConvexClientProvider>
        </div>

    </ConvexAuthNextjsServerProvider>
  )
}
