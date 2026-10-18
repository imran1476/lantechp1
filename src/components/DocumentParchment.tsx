import React from 'react';
import { ZoomIn, ZoomOut, RotateCw, Contrast, Maximize2, FileText } from 'lucide-react';

interface DocumentParchmentProps {
  zoom?: number;
  rotation?: number;
  filterMode?: 'normal' | 'contrast' | 'binary' | 'invert';
  activeHighlight?: string | null;
  onHighlightClick?: (field: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  showControls?: boolean;
}

export const DocumentParchment: React.FC<DocumentParchmentProps> = ({
  zoom = 100,
  rotation = 0,
  filterMode = 'normal',
  activeHighlight = null,
  onHighlightClick,
  page = 1,
  totalPages = 3,
  onPageChange,
  showControls = true,
}) => {
  const [internalZoom, setInternalZoom] = React.useState(zoom);
  const [internalRotation, setInternalRotation] = React.useState(rotation);
  const [internalFilter, setInternalFilter] = React.useState(filterMode);

  React.useEffect(() => {
    setInternalZoom(zoom);
  }, [zoom]);

  React.useEffect(() => {
    setInternalRotation(rotation);
  }, [rotation]);

  React.useEffect(() => {
    setInternalFilter(filterMode);
  }, [filterMode]);

  const getFilterStyle = () => {
    switch (internalFilter) {
      case 'contrast':
        return 'contrast-150 brightness-95';
      case 'binary':
        return 'contrast-200 grayscale brightness-90';
      case 'invert':
        return 'invert hue-rotate-180';
      default:
        return '';
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-surface-sunken rounded-xl overflow-hidden border border-line">
      {/* Top Document Controls Bar */}
      {showControls && (
        <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-line text-sm text-fg-muted z-10">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-mono bg-surface-raised px-2 py-0.5 rounded text-primary">
              <FileText className="w-3.5 h-3.5" />
              {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange?.(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-1.5 py-0.5 rounded bg-surface-raised hover:bg-surface-raised disabled:opacity-40"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-1.5 py-0.5 rounded bg-surface-raised hover:bg-surface-raised disabled:opacity-40"
              >
                ▶
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-fg-muted">{internalZoom}%</span>
            <button
              type="button"
              onClick={() => setInternalZoom((z) => Math.max(50, z - 15))}
              className="p-1 rounded hover:bg-surface-raised text-fg-muted"
              title="জুম আউট"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setInternalZoom(100)}
              className="p-1 rounded hover:bg-surface-raised text-fg-muted font-mono text-sm"
              title="রিসেট"
            >
              1:1
            </button>
            <button
              type="button"
              onClick={() => setInternalZoom((z) => Math.min(200, z + 15))}
              className="p-1 rounded hover:bg-surface-raised text-fg-muted"
              title="জুম ইন"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-px bg-surface-raised mx-1" />
            <button
              type="button"
              onClick={() => setInternalRotation((r) => (r + 90) % 360)}
              className="p-1 rounded hover:bg-surface-raised text-fg-muted"
              title="ঘোরান (Rotate 90°)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setInternalFilter((f) =>
                  f === 'normal' ? 'contrast' : f === 'contrast' ? 'binary' : f === 'binary' ? 'invert' : 'normal'
                )
              }
              className={`p-1 rounded hover:bg-surface-raised ${
                internalFilter !== 'normal' ? 'text-warning bg-surface-raised' : 'text-fg-muted'
              }`}
              title="কন্ট্রাস্ট / ফিল্টার বদলান"
            >
              <Contrast className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Scanned Document Canvas Area */}
      <div className="relative flex-1 overflow-auto p-4 flex items-center justify-center bg-surface-sunken/80">
        <div
          className={`transition-all duration-200 select-none ${getFilterStyle()}`}
          style={{
            transform: `scale(${internalZoom / 100}) rotate(${internalRotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Authentic Bengali Land Survey Sheet (Khatian) */}
          <div className="w-[420px] sm:w-[480px] bg-paper text-paper-ink p-6 shadow-md rounded-sm border-2 border-paper-edge relative font-serif text-sm leading-relaxed">
            {/* Paper Texture Overlay & Age Stains */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
              style={{
                backgroundImage: `radial-gradient(circle at 80% 20%, var(--paper-stain-one) 0%, transparent 20%),
                                  radial-gradient(circle at 10% 85%, var(--paper-stain-two) 0%, transparent 25%),
                                  radial-gradient(circle at 50% 50%, var(--paper-stain-three) 0%, transparent 80%)`,
              }}
            />

            {/* Official Stamp / Seal */}
            <div className="absolute top-4 right-5 w-16 h-16 border-2 border-paper-rule/60 rounded-full flex flex-col items-center justify-center text-sm text-paper-ink-soft/70 font-sans tracking-tighter uppercase p-1 rotate-[-12deg] pointer-events-none shadow-sm">
              <span className="font-bold">LAND RECORDS</span>
              <span>ঢাকা কালেক্টরেট</span>
              <span>★ RS 1978 ★</span>
            </div>

            {/* Government Seal & Header */}
            <div className="text-center border-b-2 border-paper-rule-dark pb-2 mb-3">
              <div className="text-sm tracking-wide font-bold">বাংলাদেশ ফরম নং ৫৪৬৩ (সংশোধিত)</div>
              <div className="text-base font-extrabold tracking-tight mt-0.5 text-paper-ink-strong">
                স্বত্বলিপি ও খতিয়ান (RS জরিপ)
              </div>
              <div className="text-sm text-paper-ink-muted font-sans">
                ভূমি রেকর্ড ও জরিপ অধিদপ্তর — গণপ্রজাতন্ত্রী বাংলাদেশ
              </div>
            </div>

            {/* Top metadata grid with interactive OCR bounding boxes */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 border border-paper-rule p-2 bg-paper-panel/70 mb-2">
              <div
                onClick={() => onHighlightClick?.('district')}
                className={`p-1 rounded cursor-pointer transition ${
                  activeHighlight === 'district' ? 'bg-accent/80 ring-2 ring-accent font-bold' : 'hover:bg-accent/60'
                }`}
              >
                <span className="font-semibold text-paper-ink-soft">জেলা: </span>
                <span className="font-sans font-bold text-paper-ink">ঢাকা</span>
              </div>
              <div
                onClick={() => onHighlightClick?.('upazila')}
                className={`p-1 rounded cursor-pointer transition ${
                  activeHighlight === 'upazila' ? 'bg-accent/80 ring-2 ring-accent font-bold' : 'hover:bg-accent/60'
                }`}
              >
                <span className="font-semibold text-paper-ink-soft">থানা/উপজেলা: </span>
                <span className="font-sans font-bold text-paper-ink">সাভার</span>
              </div>
              <div
                onClick={() => onHighlightClick?.('mouza')}
                className={`p-1 rounded cursor-pointer transition ${
                  activeHighlight === 'mouza' ? 'bg-accent/80 ring-2 ring-accent font-bold' : 'hover:bg-accent/60'
                }`}
              >
                <span className="font-semibold text-paper-ink-soft">মৌজা: </span>
                <span className="font-sans font-bold text-paper-ink">কাশিমপুর</span>
              </div>
              <div>
                <span className="font-semibold text-paper-ink-soft">জে.এল নং: </span>
                <span className="font-sans">২১</span>
              </div>
            </div>

            {/* Khatian Number & Survey Badge */}
            <div className="flex items-center justify-between border-y-2 border-dashed border-paper-rule py-1.5 px-2 my-2 bg-paper-highlight">
              <div
                onClick={() => onHighlightClick?.('khatianNo')}
                className={`px-2 py-0.5 rounded cursor-pointer transition ${
                  activeHighlight === 'khatianNo' ? 'bg-primary/80 ring-2 ring-primary font-bold' : 'hover:bg-primary/60'
                }`}
              >
                <span className="font-semibold">খতিয়ান নম্বর: </span>
                <span className="text-sm font-bold text-paper-ink-soft font-sans tracking-wide">১২৩৪ (1234)</span>
              </div>
              <div className="px-2 py-0.5 bg-paper-mark text-paper-mark-text rounded text-sm font-sans font-bold">
                রিভিশনাল সার্ভে (RS)
              </div>
            </div>

            {/* Owners Table */}
            <div
              onClick={() => onHighlightClick?.('owners')}
              className={`border border-paper-rule rounded-sm p-1.5 mb-2 cursor-pointer transition ${
                activeHighlight === 'owners' ? 'bg-accent/80 ring-2 ring-accent' : 'hover:bg-accent/50'
              }`}
            >
              <div className="font-bold text-sm text-paper-owner border-b border-paper-rule pb-0.5 mb-1">
                মালিকগণের নাম ও বিবরণ (স্বত্বাংশ):
              </div>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-paper-rule-soft text-paper-table">
                    <th className="py-0.5">মালিকের নাম ও পিতা/স্বামী</th>
                    <th className="py-0.5 text-right">অংশ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dotted border-paper-rule-faint">
                    <td className="py-0.5 font-sans font-semibold">১. মোঃ আব্দুল করিম, পিতা: মৃত রহমত আলী</td>
                    <td className="py-0.5 text-right font-mono font-bold">১/২ (০.৫০)</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-sans font-semibold">২. মোসাঃ সেলিনা বেগম, স্বামী: মোঃ আব্দুল করিম</td>
                    <td className="py-0.5 text-right font-mono font-bold">১/২ (০.৫০)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Plots & Area Table */}
            <div className="border border-paper-rule rounded-sm p-1.5 mb-2">
              <div className="font-bold text-sm text-paper-owner border-b border-paper-rule pb-0.5 mb-1 flex justify-between items-center">
                <span>দাগ নম্বর ও জমির বিবরণ:</span>
                <span className="text-sm text-paper-ink-faint">একক: একর ও শতক</span>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-paper-rule-soft text-paper-table">
                    <th className="py-0.5">দাগ নং</th>
                    <th className="py-0.5">শ্রেণি</th>
                    <th className="py-0.5 text-right">জমির পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    onClick={() => onHighlightClick?.('dagNo')}
                    className={`cursor-pointer transition ${
                      activeHighlight === 'dagNo'
                        ? 'bg-accent/80 ring-2 ring-accent font-bold'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <td className="py-1 font-mono font-bold text-warning flex items-center gap-1">
                      ৫৬৭ (567)
                      <span className="text-sm bg-accent text-warning px-1 rounded font-sans">কম কনফিডেন্স</span>
                    </td>
                    <td className="py-1">ধানি (নাল)</td>
                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        onHighlightClick?.('totalArea');
                      }}
                      className={`py-1 text-right font-mono font-bold ${
                        activeHighlight === 'totalArea' ? 'bg-primary text-primary px-1 rounded' : ''
                      }`}
                    >
                      ০.১২ একর (১২ শতক)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Boundaries (চৌহদ্দি) */}
            <div
              onClick={() => onHighlightClick?.('boundaries')}
              className={`text-sm border-t border-paper-rule pt-1.5 text-paper-ink-soft cursor-pointer transition ${
                activeHighlight === 'boundaries' ? 'bg-accent/80 ring-2 ring-accent p-1 rounded' : 'hover:bg-accent/50'
              }`}
            >
              <span className="font-bold">চৌহদ্দি / সীমানা: </span>
              উত্তরে-মোঃ রহিম উদ্দিন, দক্ষিণে-কামাল হোসেনের জোত, পূর্বে-রফিক মিঞা, পশ্চিমে-সরকারি কাঁচা রাস্তা।
            </div>

            {/* Footer with Revenue Officer Signature */}
            <div className="flex justify-between items-end mt-4 pt-2 border-t border-paper-rule text-sm text-paper-ink-muted">
              <div>
                তদন্তকারী: কানুনগো মোস্তফা<br />
                তারিখ: ১৫/১০/১৯৭৮
              </div>
              <div className="text-right">
                <span className="italic block font-serif text-sm text-paper-signature font-bold">এ. কে. শামসুল হক</span>
                সহকারী রাজস্ব কর্মকর্তা (সার্কেল সাভার)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
