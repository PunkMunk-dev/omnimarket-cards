export type LeadSource = "facebook" | "craigslist" | "offerup" | "mercari";

export interface Lead {
  id?: string;
  source: LeadSource;
  title: string;
  price?: number;
  description?: string;
  url: string;
  location?: string;
  imageUrl?: string;
  postedAt?: string;
  scrapedAt: string;
  keywords: string[];
}

export interface LeadScrapingResult {
  source: LeadSource;
  keywords: string[];
  leadsFound: number;
  leadsInserted: number;
  leads: Lead[];
}
