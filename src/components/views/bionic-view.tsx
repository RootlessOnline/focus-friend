'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  Upload,
  Download,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface PdfDocument {
  id: string;
  originalName: string;
  status: string;
  pageCount?: number;
  wordCount?: number;
  createdAt: Date;
}

interface BionicViewProps {
  documents: PdfDocument[];
  onUpload: (file: File) => void;
  onProcess: (documentId: string, options: { boldRatio: number }) => void;
  onDownload: (documentId: string) => void;
  onDelete: (documentId: string) => void;
  isProcessing: boolean;
}

export function BionicView({ documents, onUpload, onProcess, onDownload, onDelete, isProcessing }: BionicViewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [boldRatio, setBoldRatio] = useState(0.5);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-neon-yellow/20 text-neon-yellow">Processing</Badge>;
      case 'ready':
        return <Badge className="bg-neon-green/20 text-neon-green">Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Demo text for bionic reading preview
  const previewText = "Bionic reading makes text easier to scan by highlighting the first few letters of each word. This helps your eye move faster through the text, perfect for ADHD brains! :3";
  
  const applyBionicToText = (text: string, ratio: number) => {
    return text.split(' ').map((word, i) => {
      const highlightLength = Math.ceil(word.length * ratio);
      const highlighted = word.slice(0, highlightLength);
      const rest = word.slice(highlightLength);
      return `<strong>${highlighted}</strong>${rest}`;
    }).join(' ');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text-dva">Bionic Reading</h1>
          <p className="text-sm text-muted-foreground">Convert PDFs for easier reading~ :3</p>
        </div>
      </div>

      {/* What is Bionic Reading? */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-neon-cyan" />
            What is Bionic Reading?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Bionic reading highlights the first few letters of each word, making it easier for your brain 
            to quickly scan and process text. It's especially helpful for ADHD brains that might struggle 
            with traditional reading! :3
          </p>
          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <p 
              className="text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: applyBionicToText(previewText, boldRatio) }}
            />
          </div>
          <div className="mt-4">
            <Label>Bold Ratio: {Math.round(boldRatio * 100)}%</Label>
            <Input
              type="range"
              min="0.3"
              max="0.7"
              step="0.05"
              value={boldRatio}
              onChange={(e) => setBoldRatio(parseFloat(e.target.value))}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload PDF</CardTitle>
          <CardDescription>Upload a PDF to convert it to bionic reading format</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragOver ? 'border-neon-pink bg-neon-pink/10' : 'border-[var(--border-subtle)]'}
            `}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
              id="pdf-upload"
            />
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            {selectedFile ? (
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button onClick={handleUpload} className="btn-neon-primary">
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-2">
                  Drag and drop a PDF here, or click to browse
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            {documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No documents yet</p>
                <p className="text-sm">Upload a PDF to get started!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-neon-cyan transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-neon-cyan" />
                      <div>
                        <p className="font-medium">{doc.originalName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(doc.createdAt)}</span>
                          {doc.pageCount && <span>• {doc.pageCount} pages</span>}
                          {doc.wordCount && <span>• {doc.wordCount} words</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc.status)}
                      {doc.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => onProcess(doc.id, { boldRatio })}
                          className="btn-neon-primary"
                        >
                          Process
                        </Button>
                      )}
                      {doc.status === 'processing' && (
                        <Loader2 className="w-4 h-4 animate-spin text-neon-yellow" />
                      )}
                      {doc.status === 'ready' && (
                        <Button
                          size="sm"
                          onClick={() => onDownload(doc.id)}
                          className="btn-neon-secondary"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(doc.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💡 Tips for Bionic Reading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
              <span>Best for long articles, documentation, or study materials</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
              <span>Adjust the bold ratio to find what works best for you</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
              <span>Combine with a calm environment for best focus results</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-neon-green mt-0.5 flex-shrink-0" />
              <span>Try different font sizes - larger text often works better!</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
