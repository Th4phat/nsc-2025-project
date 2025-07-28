import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Toaster } from "sonner";

const sarabun = Sarabun({
  variable: "--sarabun",
  weight: ["100", "400", "700"],
  subsets: ["thai"]
})
export const metadata: Metadata = {
  title: "ระบบจัดการเอกสารและส่งต่อด้วยปัญญาประดิษฐ์",
  description: "เพื่อการนำเสนอในการแข่งขันการทำโครงงาน nsc 2025",
  icons: {
    icon: "/convex.svg",  
  },
  // Add font preloads
  // link: [
  //   {
  //     rel: "preload",
  //     href: geistSans.variable,
  //     as: "font",
  //     type: "font/woff2",
  //     crossOrigin: "anonymous",
  //   },
  //   {
  //     rel: "preload",
  //     href: geistMono.url,
  //     as: "font",
  //     type: "font/woff2",
  //     crossOrigin: "anonymous",
  //   },
  // ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body
          className={`${sarabun.className} antialiased`}
        >
          
          <ConvexClientProvider><Toaster richColors />{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}

