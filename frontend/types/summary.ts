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

export interface SummaryActionRequest {
  action: "approve" | "reject";
}

