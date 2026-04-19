import fs from 'fs';
import path from 'path';
import QueryDashboard from './query-dashboard';
import type { SiteData } from './types';

export default async function QueryDashboardServer() {
  const sitesPath = path.join(process.cwd(), 'public', 'data', 'sites.json');
  const allSitesPath = path.join(process.cwd(), 'public', 'data', 'all-sites.json');
  
  const sitesData = JSON.parse(fs.readFileSync(sitesPath, 'utf8')) as Record<string, SiteData>;
  const allSitesData = JSON.parse(fs.readFileSync(allSitesPath, 'utf8')) as Record<string, SiteData>;
  
  return <QueryDashboard initialSites={sitesData} initialAllSites={allSitesData} />;
}
