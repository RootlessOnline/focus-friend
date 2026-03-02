import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DEMO_USER_ID = 'demo-user';
const UPLOAD_DIR = '/home/z/my-project/download/pdfs';

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function GET(request: NextRequest) {
  const documents = await db.pdfDocument.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Create document record
    const document = await db.pdfDocument.create({
      data: {
        userId: DEMO_USER_ID,
        originalName: file.name,
        storedPath: filepath,
        status: 'pending',
        boldRatio: 0.5,
        fontSize: 12,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, boldRatio } = body;

    // Update document settings and mark as processing
    const document = await db.pdfDocument.update({
      where: { id },
      data: {
        status: 'processing',
        boldRatio: boldRatio || 0.5,
      },
    });

    // In a real implementation, we would process the PDF here
    // For now, we'll simulate processing by just updating status
    // A full implementation would use pdf-lib or similar to:
    // 1. Extract text from PDF
    // 2. Apply bionic reading (bold first letters)
    // 3. Generate new PDF
    
    // Simulate processing delay
    setTimeout(async () => {
      await db.pdfDocument.update({
        where: { id },
        data: {
          status: 'ready',
          processedPath: document.storedPath.replace('.pdf', '-bionic.pdf'),
          pageCount: 1,
          wordCount: 100,
        },
      });
    }, 100);

    return NextResponse.json({ success: true, status: 'processing' });
  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await db.pdfDocument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
