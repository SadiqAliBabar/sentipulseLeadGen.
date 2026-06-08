export interface Stage {
  name: string;
  icon: string;
  eta: number;
  desc: string;
  data: Record<string, string>;
}

export interface Competitor {
  name: string;
  distance: string;
}

export interface TechnicalCondition {
  title: string;
  subtext: string;
  severity: "critical" | "warning";
}

export interface Review {
  author: string;
  rating: number;
  date: string;
  text: string;
}

export interface ReviewSummary {
  status?: "positive" | "mixed" | "critical";
  business_status?: string;
  summary?: string;
  overallSummary?: string;
  recurringIssues?: Array<{ issue: string; count: number }>;
  recurring_issues?: Array<any>;
  isolated_incidents?: Array<any>;
  isolated_issues?: Array<any>;
  total_issue_count?: number;
}

export interface Lead {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewsCount: number;
  phone: string;
  website: string;
  hasWebsite: boolean;
  filteredByCriteria: boolean;
  filteredByCriteriaWithWebsite: boolean;
  seoGrade: "A" | "B" | "C" | "D" | "F";
  seoGradeTrend: "up" | "down" | "stable";
  gbpScore: number;
  gbpStatus: "Critical" | "Warning" | "Good";
  mobileSpeed: number;
  mobileSeo: number;
  revenueImpact: string;
  missingItems: Array<{ name: string; severity: "critical" | "warning" }>;
  competitors: Competitor[];
  technicalHealth: TechnicalCondition[];
  reviews?: Review[];
  reviewSummary?: ReviewSummary;
  gbpAuditRaw?: any;
  pagespeedRaw?: any;
  lighthouseSeoRaw?: any;
  websiteCrawlRaw?: any;
  seoAuditRaw?: any;
  neighboursRaw?: any;
  rankTrackerRaw?: any;
  rank_tracker?: any;
  google_reviews?: any;
}

export type ViewMode = "process-loop" | "dashboard" | "campaigns" | "run-pipeline";
