"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export interface AttachmentListProps {
  attachments: { id: string; url: string; type: string }[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  const downloadFile = async (url: string, name?: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = name || "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {attachments.map((att) => {
          const name = att.url.split("/").pop();
          const isImage = att.type.startsWith("image/");
          return (
            <div
              key={att.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                {isImage ? (
                  <Image
                    src={att.url}
                    alt={name || ""}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-cover"
                  />
                ) : (
                  <FileText className="h-8 w-8 text-muted" />
                )}
                <p className="text-sm font-medium truncate">{name}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="icon" variant="outline">
                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => downloadFile(att.url, name || undefined)}
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
