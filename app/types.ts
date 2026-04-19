export interface SiteData {
  name: string;
  propertyId: string;
  updatedAt: string;
  error?: string;
  trend?: { dimensions: string[]; metrics: string[] }[];
  topPages?: { dimensions: string[]; metrics: string[] }[];
  sources?: { dimensions: string[]; metrics: string[] }[];
  countries?: { dimensions: string[]; metrics: string[] }[];
  summary7d: {
    sessions: number;
    users: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  summary30d: {
    sessions: number;
    users: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
}
