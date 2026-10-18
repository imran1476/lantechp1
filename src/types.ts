export type SurveyType = 'CS' | 'SA' | 'RS' | 'BS';
export type DocType = 'খতিয়ান' | 'পর্চা' | 'দলিল' | 'নামজারি' | 'অন্যান্য';
export type RecordStatus = 'প্রসেসিং' | 'অপেক্ষারত' | 'পর্যালোচনায়' | 'অনুমোদিত' | 'সংশোধিত' | 'প্রত্যাখ্যাত';

export interface Owner {
  id: string;
  name: string;
  fatherOrSpouse: string;
  share: string; // e.g. "১/২" or "৮ আনা" or "০.৫০"
  shareDecimal: number; // 0.5
  address: string;
}

export interface PlotInfo {
  dagNo: string;
  dagNoBn: string;
  landClass: string;
  area: number;
  areaUnit: 'একর' | 'শতক' | 'কাঠা';
  confidence: number;
  /** এই খতিয়ানে দাগটির কত অংশ (যেমন "১/২"); না থাকলে পূর্ণ (১) ধরা হয়। নিয়ম ৭-এর জন্য */
  dagShare?: string;
}

export interface Boundaries {
  north: string;
  south: string;
  east: string;
  west: string;
}

export type IssueSeverity = 'error' | 'warning';

/** যাচাইয়ের একটি ফলাফল। rule = প্ল্যানের নিয়ম নম্বর (১–৮) */
export interface ValidationIssue {
  rule: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  severity: IssueSeverity;
  /** কোন ফিল্ড: surveyType, district, upazila, mouza, khatianNo, dagNo, totalArea, owners, owners.0.share, plots.1.area ইত্যাদি */
  field: string;
  message: string;
}

export interface ValidationChecks {
  sharesSum: 'ok' | 'mismatch' | 'warning' | 'invalid';
  sharesSumValue: number;
  areaSum: 'ok' | 'mismatch' | 'warning';
  surveyValid: 'ok' | 'invalid';
  mandatoryFields: 'ok' | 'missing';
  unitConsistency: 'ok' | 'mismatch';
  numeralNormalized: boolean;
  notes?: string;
  /** নিচের ঐচ্ছিক ফিল্ডগুলো নতুন রুল ইঞ্জিন (src/utils/validation.ts) পূরণ করে */
  issues?: ValidationIssue[];
  fieldStatus?: Record<string, 'ok' | 'warn' | 'error'>;
  lowConfidenceFields?: string[];
  dagOverlap?: 'ok' | 'warning';
  /** শতকে: দাগগুলোর যোগফল ও মোট জমি (নিয়ম ৩ দেখানোর জন্য) */
  areaSumValues?: { plotsSum: number; total: number };
}

export interface RelatedSurveyRecord {
  surveyType: SurveyType;
  khatianNo: string;
  dagNo: string;
  matchPercentage: number;
  ownerName: string;
  area: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  operator: string;
  details: string;
  hash: string;
  /** আগের লগের হ্যাশ (চেইনের জন্য) — সার্ভার-তৈরি লগে থাকে */
  prevHash?: string;
  /** এই কাজের পরের রেকর্ড-বিষয়বস্তুর SHA-256 */
  recordHash?: string;
}

export interface LandRecord {
  id: string;
  khatianNo: string;
  khatianNoBn: string;
  dagNo: string;
  dagNoBn: string;
  surveyType: SurveyType;
  docType: DocType;
  district: string;
  upazila: string;
  mouza: string;
  jlNo: string;
  landClass: string;
  totalArea: number; // e.g. 0.12
  totalAreaBn: string; // "০.১২"
  areaUnit: 'একর' | 'শতক' | 'কাঠা';
  owners: Owner[];
  plots: PlotInfo[];
  boundaries: Boundaries;
  rawOcrText: string;
  confidenceScore: number;
  fieldConfidences: {
    district: number;
    upazila: number;
    mouza: number;
    khatianNo: number;
    dagNo: number;
    totalArea: number;
    owners: number;
    boundaries: number;
  };
  checks: ValidationChecks;
  status: RecordStatus;
  dateCreated: string;
  dateVerified?: string;
  verifiedBy?: string;
  recordHash: string;
  relatedRecords: RelatedSurveyRecord[];
  auditLogs: AuditLogEntry[];
  /** আপলোড করা মূল ছবির ঠিকানা (লগইন-সুরক্ষিত /api রুট)। না থাকলে নমুনা চিত্র দেখানো হয় */
  imageUrl?: string;
  /** ছবির ধরন (image/jpeg, image/png, application/pdf) */
  imageMime?: string;
  /** সত্য হলে রেকর্ডটি OCR থেকে আসেনি, কাল্পনিক ডেমো ডেটা */
  isDemoData?: boolean;
  /** কে আপলোড করেছে (ব্যবহারকারীর ইউজারনেম) */
  createdBy?: string;
}

export interface UploadedFileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'প্রসেসিং' | 'অপেক্ষারত' | 'সফল' | 'ব্যর্থ';
  progress: number;
  recordId?: string;
  previewUrl?: string;
  /** ছবি পরিষ্কারের ফল ইত্যাদি, ফাইল-তালিকায় দেখানোর জন্য */
  note?: string;
}
