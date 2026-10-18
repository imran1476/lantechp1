import React from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Calculator,
  Search,
  ExternalLink
} from 'lucide-react';

interface ConceptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConceptModal: React.FC<ConceptModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-surface-sunken/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-surface border border-line rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-md overflow-hidden my-auto animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-line bg-surface-sunken/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-fg flex items-center gap-2">
                LandTech ২০২৬ • ভূমিলিপি (BhoomiAI)
              </h2>
              <span className="text-sm text-primary font-mono">
                সমস্যা বিবরণী: P1 — পুরোনো রেকর্ড ডিজিটাইজেশন প্রজেক্ট প্ল্যান
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-fg-muted hover:text-on-primary hover:bg-surface-raised transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-fg-muted leading-relaxed">
          {/* Section 1: এক নজরে */}
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2">
            <h3 className="text-sm font-bold text-fg flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              এক নজরে: আমরা কী করছি?
            </h3>
            <p className="text-fg-muted">
              রুলবুকের P1 বলছে: স্ক্যান করা খতিয়ান, পর্চা ও দলিল (হাতে লেখা ও ছাপা বাংলা) থেকে কাঠামাবদ্ধ, অনুসন্ধানযোগ্য ডেটা বানাতে হবে। আমরা ঠিক সেটাই করেছি, সঙ্গে <b>ভুল ধরার স্বয়ংক্রিয় রুল ইঞ্জিন</b> ও <b>মানব রিভিউ</b> যুক্ত করেছি।
            </p>
          </div>

          {/* Section 2: শুধু OCR নয়, ৩টি জিনিস একসঙ্গে */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-raised/60 border border-line/60">
              <div className="font-bold text-fg text-sm mb-1 flex items-center gap-1.5 text-fg-muted">
                <Cpu className="w-4 h-4" />
                ১. পড়া (OCR)
              </div>
              <p className="text-sm text-fg-muted">
                ছবি পরিষ্কার করে বাংলা OCR চালানো এবং মালিক, দাগ, জমির পরিমাণ ইত্যাদি ফিল্ড আলাদা করা।
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised/60 border border-line/60">
              <div className="font-bold text-fg text-sm mb-1 flex items-center gap-1.5 text-warning">
                <Calculator className="w-4 h-4" />
                ২. যাচাই (রুলবুক)
              </div>
              <p className="text-sm text-fg-muted">
                অংশের যোগফল, ক্ষেত্রফলের যোগফল, একক ও ফরম্যাট ঠিক আছে কি না নিজে নিজে মিলিয়ে দেখা।
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised/60 border border-line/60">
              <div className="font-bold text-fg text-sm mb-1 flex items-center gap-1.5 text-primary">
                <Search className="w-4 h-4" />
                ৩. খোঁজা (আর্কাইভ)
              </div>
              <p className="text-sm text-fg-muted">
                যাচাই হওয়া তথ্য ডাটাবেসে রেখে খতিয়ান নম্বর, দাগ নম্বর বা মালিকের নামে ফাজি সার্চ।
              </p>
            </div>
          </div>

          {/* Section 3: আমাদের সবচেয়ে শক্ত অংশ: স্বয়ংক্রিয় যাচাইয়ের ৮টি নিয়ম */}
          <div className="p-4 rounded-xl bg-surface-sunken border border-line space-y-3">
            <h3 className="text-sm font-bold text-fg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>আমাদের সবচেয়ে শক্ত অংশ: স্বয়ংক্রিয় যাচাই (পৃষ্ঠা ৬ এর নিয়মসমূহ)</span>
            </h3>
            <p className="text-sm text-fg-muted">
              OCR ভুল করলে সিস্টেম যেন তা নিজে ধরে দিতে পারে; এটাই সিস্টেমের মূল শক্তি:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded-lg bg-surface border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-primary">১.</span>
                <div><b>অঙ্ক স্বাভাবিকীকরণ:</b> বাংলা অঙ্ক (১৪২) থেকে সংখ্যা (142) স্বয়ংক্রিয় ঠিক।</div>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-danger">২.</span>
                <div><b>অংশের যোগফল:</b> মালিকদের অংশ যোগ করলে পূর্ণ (১ বা ১৬ আনা) হতে হবে; না মিললে লাল।</div>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-danger">৩.</span>
                <div><b>ক্ষেত্রফলের যোগফল:</b> দাগগুলোর জমির যোগফল = খতিয়ানের মোট জমি; না মিললে লাল।</div>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-warning">৪.</span>
                <div><b>এককের সামঞ্জস্য:</b> ১ একর = ১০০ শতক; মিশে গেলে হলুদ সংকেত।</div>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-danger">৫.</span>
                <div><b>বৈধ জরিপ:</b> CS / SA / RS / BS এর বাইরে কিছু থাকলে লাল সংকেত।</div>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-warning">৬.</span>
                <div><b>কনফিডেন্স রং:</b> সবুজ (≥৮৫%), হলুদ (৬০-৮৪% সতর্কতা), লাল (নিয়ম ভঙ্গ)।</div>
              </div>
            </div>
          </div>

          {/* Section 4: ৩ মিনিটের ডেমো ভিডিওর রোডম্যাপ */}
          <div className="p-4 rounded-xl bg-surface-raised/40 border border-line/60 space-y-2">
            <h3 className="text-sm font-bold text-fg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>৩ মিনিটের প্রেজেন্টেশন ও ডেমো রূপরেখা (পৃষ্ঠা ৭)</span>
            </h3>
            <div className="space-y-1.5 text-sm text-fg-muted">
              <div className="flex gap-2">
                <span className="font-mono text-primary font-bold shrink-0">০:০০ - ০:২০</span>
                <span><b>সমস্যা:</b> পুরোনো খতিয়ান ছেঁড়া, ঝাপসা ও অসংলগ্ন জরিপ বিরোধ।</span>
              </div>
              <div className="flex gap-2">
                <span className="font-mono text-primary font-bold shrink-0">০:২০ - ২:২০</span>
                <span><b>লাইভ ডেমো:</b> স্ক্যান আপলোড → ছবি সোজা/নয়েজ দূরীকরণ → OCR ও ফিল্ড নিষ্কাশন → ভুল ধরা (দাগ নম্বর কনফিডেন্স ও অংশ যোগফল) → সংশোধন → সার্চযোগ্য আর্কাইভে সংরক্ষণ।</span>
              </div>
              <div className="flex gap-2">
                <span className="font-mono text-primary font-bold shrink-0">২:২০ - ৩:০০</span>
                <span><b>প্রভাব ও দেশব্যাপী পরিকল্পনা:</b> পাইলট উপজেলা → জেলা → ই-নামজারি ও জাতীয় নিবন্ধন সংযোগ।</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line bg-surface-sunken/60 flex justify-between items-center text-sm">
          <span className="text-fg-muted">LandTech ২০২৬ • ভূমিলিপি ডিজিটাইজেশন কনসেপ্ট নোট</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-on-primary font-bold transition"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
