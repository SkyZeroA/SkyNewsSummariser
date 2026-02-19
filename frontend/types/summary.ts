// Represents a source article that was used to create the comprehensive summary
export interface SourceArticle {
  title: string;
  url: string;
}

// Represents a comprehensive summary that combines multiple articles
export interface ComprehensiveSummary {
  id: string;
  summaryText: string;
  sourceArticles: SourceArticle[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface ComprehensiveSummaryUpdateRequest {
  summaryText: string;
}

export interface SummaryActionRequest {
  action: "approve" | "reject";
}

// Legacy types - kept for backwards compatibility if needed
export interface Summary {
  id: string;
  articleTitle: string;
  articleUrl: string;
  summaryText: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface SummaryUpdateRequest {
  articleTitle: string;
  summaryText: string;
}

