"use client"

import type React from "react"

import { useState } from "react"
import { Upload, File as FileIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from "@/lib/config/upload"

type UploadingFile = {
  id: string
  name: string
  progress: number
  type: string
}

export interface AttachmentUploadProps {
  onFilesSelected?: (files: globalThis.File[]) => void
}

export function AttachmentUpload({ onFilesSelected }: AttachmentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [errorMessages, setErrorMessages] = useState<string[]>([])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
      // Reset input value to allow re-selecting the same file
      e.currentTarget.value = ''
    }
  }

  const handleFiles = (files: File[]) => {
    // Validate file sizes
    const oversize = files.filter(file => file.size > MAX_UPLOAD_SIZE_BYTES)
    if (oversize.length > 0) {
      setErrorMessages(oversize.map(f => `${f.name} is too large. Max size is ${MAX_UPLOAD_SIZE_MB} MB.`))
    } else {
      setErrorMessages([])
    }
    // Filter for accepted file types and sizes
    const acceptedFiles = files.filter((file) => {
      const fileType = file.type.toLowerCase()
      const isSizeOk = file.size <= MAX_UPLOAD_SIZE_BYTES
      return (
        isSizeOk && (
          fileType.includes("pdf") ||
          fileType.includes("image/jpeg") ||
          fileType.includes("image/png") ||
          fileType.includes("image/gif")
        )
      )
    })

    // Create uploading file objects
    const newUploadingFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      progress: 0,
      type: file.type,
    }))

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles])

    // Notify parent of selected files
    onFilesSelected?.(acceptedFiles)

    // Simulate upload progress
    newUploadingFiles.forEach((file) => {
      simulateUploadProgress(file.id)
    })
  }

  const simulateUploadProgress = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 10) + 5
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
      }

      setUploadingFiles((prev) => {
        const updated = prev.map((file) => (file.id === fileId ? { ...file, progress } : file))
        // Remove files that have completed uploading
        return updated.filter((file) => file.progress < 100)
      })
    }, 300)
  }

  return (
    <div className="space-y-4">
      {/* Display file size errors */}
      {errorMessages.length > 0 && (
        <div className="mb-2">
          {errorMessages.map((msg, idx) => (
            <p key={idx} className="text-sm text-red-500">{msg}</p>
          ))}
        </div>
      )}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          isDragging ? "border-primary bg-primary/10" : "border-input"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">Drag and drop files here</p>
          <p className="text-xs text-muted-foreground">Supports: PDF, JPG, PNG, GIF</p>
          <div className="mt-2">
            <label htmlFor="file-upload">
              <Button type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <FileIcon className="h-4 w-4 mr-2" />
                Browse files
              </Button>
              <input
                id="file-upload"
                name="files"
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div key={file.id} className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-medium truncate">{file.name}</span>
                <span>{file.progress}%</span>
              </div>
              <Progress value={file.progress} className="h-2" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
