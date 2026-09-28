'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { printAgrometBulletin, downloadTextBulletin, generateAgrometBulletinHtml } from '@/lib/agrometBulletinGenerator';

interface AgrometBulletinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgrometBulletinModal({ isOpen, onClose }: AgrometBulletinModalProps) {
  const { weather, location, language: defaultLanguage } = useApp();
  const [docLang, setDocLang] = useState<'en' | 'hi'>(defaultLanguage);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    setIsPrinting(true);
    printAgrometBulletin(location, weather, docLang);
    setTimeout(() => setIsPrinting(false), 1500);
  };

  const handleDownloadTxt = () => {
    downloadTextBulletin(location, weather);
  };

  const previewHtml = generateAgrometBulletinHtml(location, weather, docLang);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-scrim/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="flex flex-col bg-surface-container-lowest w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-surface-container-high overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-surface-container-low border-b border-surface-container-high">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[1.25rem]">picture_as_pdf</span>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-on-surface leading-tight">
                {docLang === 'hi' ? 'आधिकारिक कृषि मौसम बुलेटिन (PDF)' : 'Official Agromet Meteorological Bulletin'}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-medium">
                IMD / GKMS Agromet Division • {location.name}, {location.state}
              </p>
            </div>
          </div>

          {/* Controls: Language toggle, Print, TXT, Close */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Language switch */}
            <div className="flex items-center bg-surface-container rounded-full p-0.5 border border-surface-container-high">
              <button
                type="button"
                onClick={() => setDocLang('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all ${
                  docLang === 'en'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setDocLang('hi')}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all ${
                  docLang === 'hi'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Plain text download */}
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-surface-container-highest text-on-surface text-xs font-bold hover:bg-surface-container transition-all active:scale-95"
              title="Download as Plain Text (.txt)"
            >
              <span className="material-symbols-outlined text-[1.1rem] text-secondary">description</span>
              <span className="hidden sm:inline">Download .TXT</span>
            </button>

            {/* Print / Save as PDF button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[1.1rem]">print</span>
              <span>{isPrinting ? 'Preparing...' : 'Print / Save PDF'}</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[1.2rem]">close</span>
            </button>
          </div>
        </div>

        {/* Bulletin Interactive Preview (Rendered HTML) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-container-lowest/50">
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div 
              className="bulletin-preview"
              dangerouslySetInnerHTML={{ __html: previewHtml }} 
            />
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-2.5 bg-surface-container-low border-t border-surface-container-high flex flex-wrap items-center justify-between text-[11px] text-on-surface-variant">
          <span>💡 <strong>Tip:</strong> In the browser print dialog, choose &quot;Save as PDF&quot; under Destination to export an A4 document.</span>
          <span className="font-mono text-[10px] text-outline">Format: A4 Vector • GKMS-IMD Compliant</span>
        </div>
      </div>
    </div>
  );
}
