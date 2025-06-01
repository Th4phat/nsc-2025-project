import React, { useState } from "react";
import { ShareModal } from "@/components/ShareModal";
import { Button } from '@/components/ui/button';

interface RightSidebarProps {
  document: {
    name: string;
    sharedBy: string;
    dateShared: string;
    fileSize: string;
    fileType: string;
    tags?: string[];
  } | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ document }) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  if (!document) {
    return null;
  }

  return (
    <aside className="w-1/4 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 truncate mb-2">
          {document.name}
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            className=""
            title="ดาวน์โหลด"
          >
            {/* Download Icon */}
            ดาวน์โหลด
          </Button>
          <Button
            className=""
            variant="ghost"
            title="แชร์"
            onClick={() => setIsShareModalOpen(true)}
          >
            {/* Share Icon */}
            แชร์
          </Button>
          <Button
            variant="ghost"
            className=""
            title="แก้ไขข้อมูล"
          >
            {/* Edit Icon */}
            แก้ไข
          </Button>
          <Button
            variant="ghost"
            className=""
            title="ย้ายไปโฟลเดอร์"
          >
            {/* Move to Folder Icon */}
            ย้าย
          </Button>
          <Button
            variant="ghost"
            className="p-1.5 rounded-full text-red-500 hover:bg-red-100 hover:text-red-700"
            title="ลบ"
          >
            {/* Delete Icon */}
            ลบ
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 text-sm">
        <div>
          <dt className="font-medium text-gray-500">แชร์โดย</dt>
          <dd className="text-gray-900 mt-1">{document.sharedBy}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">วันที่แชร์</dt>
          <dd className="text-gray-900 mt-1">{document.dateShared}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">ขนาดไฟล์</dt>
          <dd className="text-gray-900 mt-1">{document.fileSize}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">ประเภทไฟล์</dt>
          <dd className="text-gray-900 mt-1">{document.fileType}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500 mb-1">หมวดหมู่ AI</dt>
          <dd className="flex flex-wrap gap-1">
            {document.tags && document.tags.map((tag, tagIndex) => {
              const colors = ["bg-green-100", "bg-yellow-100", "bg-red-100", "bg-blue-100", "bg-purple-100"];
              const textColor = ["text-green-800", "text-yellow-800", "text-red-800", "text-blue-800", "text-purple-800"];
              const colorIndex = tagIndex % colors.length;
              return (
                <span
                  key={tagIndex}
                  className={`${colors[colorIndex]} ${textColor[colorIndex]} text-xs font-medium px-2.5 py-0.5 rounded-full`}
                >
                  {tag}
                </span>
              );
            })}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500 mb-1">แชร์ให้กับ</dt>
          <dd className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">
                  บจ
                </span>
                <span>สายฟ้า สว่างตา</span>
              </span>
              <span className="text-gray-500">ดูได้เท่านั้น</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs">
                  ชด
                </span>
                <span>ทองคำ ร่ำรวย</span>
              </span>
              <span className="text-gray-500">ดูได้เท่านั้น</span>
            </div>
          </dd>
        </div>
      </div>

      <div className="flex-grow p-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-500 mb-2">
          แสดงตัวอย่าง
        </h4>
        <div className="bg-gray-100 border border-gray-200 rounded-md h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            {/* File Question Icon */}
            ไม่สามารถแสดงตัวอย่างได้
          </div>
        </div>
      </div>

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </aside>
  );
};

export default RightSidebar;