"use client";

import React, { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Dialog, DialogOverlay, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";

// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerModalProps {
  pdfUrl: string | null;
  onClose: () => void;
}

export function PdfViewerModal({ pdfUrl, onClose }: PdfViewerModalProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPageNumber((prevPageNumber) => Math.min(prevPageNumber + 1, numPages || 1));
  }, [numPages]);

  return (
    <Dialog open={!!pdfUrl} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-auto">
        <DialogContent className="fixed z-50 bg-white rounded-lg shadow-xl p-4 max-w-3xl w-full h-auto max-h-[90vh] flex flex-col pointer-events-auto border-none">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">PDF Viewer</h2>
            <Button onClick={onClose} variant="ghost" size="sm">
              Exit
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto flex justify-center items-start">
            {pdfUrl ? (
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={console.error}
              >
                <Page
                  pageNumber={pageNumber}
                  width={Math.min(800, window.innerWidth * 0.7)} // Adjust width for responsiveness
                />
              </Document>
            ) : (
              <p>No PDF selected.</p>
            )}
          </div>
          <div className="flex justify-center items-center mt-4 space-x-2">
            <Button onClick={handlePreviousPage} disabled={pageNumber <= 1}>
              Previous Page
            </Button>
            <span>
              Page {pageNumber} of {numPages || "..."}
            </span>
            <Button onClick={handleNextPage} disabled={pageNumber >= (numPages || 1)}>
              Next Page
            </Button>
          </div>
        </DialogContent>
      </DialogOverlay>
    </Dialog>
  );
}