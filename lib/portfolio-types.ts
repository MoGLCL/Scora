export interface PortfolioProjectSummary {
  id: number;
  title: string;
  description: string | null;
  previewUrl: string | null;
  githubUrl?: string | null;
  isOpenSource?: boolean;
  projectStatus?: "completed" | "in_progress";
  executionTime?: string | null;
  startDate?: string | null;
  technologies: string[];
  coverImageUrl: string | null;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
}

export interface PortfolioProjectDetail extends PortfolioProjectSummary {
  developerId: number;
  developerUserId: number;
  developerName: string;
  developerUsername: string | null;
  developerAvatarUrl: string | null;
  images: Array<{ id: number; url: string; altText: string | null }>;
  reviews: Array<{
    id: number;
    rating: number;
    comment: string | null;
    reviewerName: string;
    reviewerRole: string;
    reviewerAvatarUrl: string | null;
    createdAt: string;
  }>;
  currentUserReview: { rating: number; comment: string | null } | null;
}
