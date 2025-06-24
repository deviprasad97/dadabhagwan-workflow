import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansGujarati-Regular.ttf');
    const fontBuffer = await fs.promises.readFile(fontPath);

    return new NextResponse(fontBuffer, {
      headers: {
        'Content-Type': 'font/ttf',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving font:', error);
    return new NextResponse('Font not found', { status: 404 });
  }
} 