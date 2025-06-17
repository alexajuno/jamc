"use client"

import { FileText, Trash2, Download, Eye } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export interface AttachmentGalleryProps {
  files: File[]
  onRemove?: (file: File) => void
}

export function AttachmentGallery({ files, onRemove }: AttachmentGalleryProps) {
  // Don't render if no uploaded files
  if (files.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-3">Attached Files</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {files.map((file, idx) => (
          <Card key={idx} className="overflow-hidden">
            <div className="h-24 flex items-center justify-center bg-white">
              {file.type === "application/pdf" ? (
                <FileText className="h-12 w-12 text-red-500" />
              ) : (
                <Image src={URL.createObjectURL(file)} alt={file.name} width={100} height={100} className="w-full h-full object-contain" unoptimized />
              )}
            </div>

            <div className="p-2">
              <p className="text-sm font-medium truncate" title={file.name}>
                {file.name}
              </p>

              <div className="flex justify-between mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title={file.type === "application/pdf" ? "Download PDF" : "View Image"}
                  onClick={() => window.open(URL.createObjectURL(file), "_blank")}
                >
                  {file.type === "application/pdf" ? <Download className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  title="Remove"
                  onClick={() => onRemove?.(file)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
