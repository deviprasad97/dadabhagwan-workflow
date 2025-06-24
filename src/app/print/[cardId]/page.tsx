'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Printer, 
  Plus, 
  Minus, 
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Card } from '@/lib/types';

export default function PrintPage() {
  const params = useParams();
  const cardId = params.cardId as string;
  const [card, setCard] = useState<Card | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const fetchCard = async () => {
      if (!cardId) return;
      
      try {
        const cardDoc = await getDoc(doc(firestore, 'cards', cardId));
        if (cardDoc.exists()) {
          setCard({ id: cardDoc.id, ...cardDoc.data() } as Card);
        }
      } catch (error) {
        console.error('Error fetching card:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [cardId]);

  const handlePrint = () => {
    setShowControls(false);
    setTimeout(() => {
      window.print();
      setShowControls(true);
    }, 100);
  };

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 10));
  const resetFontSize = () => setFontSize(16);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading card...</div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Card not found</div>
      </div>
    );
  }

  const formData = card.metadata?.formData || {};
  const fullName = `${formData.firstname || ''} ${formData.lastname || ''}`.trim();
  const gnanTaken = formData.gnan_vidhi_year ? 'Y' : 'N';
  const date = new Date(card.metadata?.submissionTimestamp || card.createdAt).toLocaleDateString('en-US');
  const gujaratiText = card.metadata?.approvedTranslation || card.metadata?.gujaratiTranslation || '';

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden during print */}
      {showControls && (
        <div className="print:hidden bg-gray-50 border-b p-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">Print Preview</h1>
              <Badge variant="outline">{card.title}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white rounded-md border p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={decreaseFontSize}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm font-medium">{fontSize}px</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={increaseFontSize}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetFontSize}
                  className="h-8 w-8 p-0"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowControls(!showControls)}
                className="h-8 w-8 p-0"
              >
                {showControls ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-12">
        <div 
          className="border-2 border-black print:border-black"
          style={{ fontSize: `${fontSize}px` }}
        >
          {/* First Row: Name and Gnan Taken */}
          <div className="flex border-b border-black print:border-black">
            <div className="w-1/2 border-r border-black print:border-black p-4 print:p-6">
              <div className="font-bold mb-2">Mahatma name:</div>
              <div>{fullName || ''}</div>
            </div>
            <div className="w-1/2 p-4 print:p-6">
              <div className="font-bold mb-2">Gnan taken: Y/N</div>
              <div>{gnanTaken}</div>
            </div>
          </div>

          {/* Second Row: Date and Age */}
          <div className="flex border-b border-black print:border-black">
            <div className="w-1/2 border-r border-black print:border-black p-4 print:p-6">
              <div className="font-bold mb-2">Date:</div>
              <div>{date}</div>
            </div>
            <div className="w-1/2 p-4 print:p-6">
              <div className="font-bold mb-2">Age:</div>
              <div>{formData.age || ''}</div>
            </div>
          </div>

          {/* Third Row: Questions */}
          <div className="flex min-h-[300px] print:min-h-[400px]">
            <div className="w-1/2 border-r border-black print:border-black p-4 print:p-6">
              <div className="font-bold mb-2">English:</div>
              <div className="whitespace-pre-wrap">
                {formData.english_question || ''}
              </div>
            </div>
            <div className="w-1/2 p-4 print:p-6">
              <div className="font-bold mb-2">Gujarati:</div>
              <div className="whitespace-pre-wrap" style={{ fontFamily: 'Noto Sans Gujarati, Arial, sans-serif' }}>
                {gujaratiText || 'No translation available'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info - Hidden during print */}
        <div className="print:hidden mt-8 text-center text-sm text-gray-500">
          <p>Use your browser's print function (Ctrl+P / Cmd+P) for best results</p>
          <p>If you increase the font size, please make sure to keep margins to minimum</p>
          <p>Gujarati font will render properly when printed from most modern browsers. Google Chrome is recommended.</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
} 