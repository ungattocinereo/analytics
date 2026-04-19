import fs from 'fs';
import path from 'path';
import SimpleDashboard from './simple-dashboard';
import type { SiteData } from './types';

export default async function SimpleDashboardServer() {
  const sitesPath = path.join(process.cwd(), 'public', 'data', 'sites.json');
  const allSitesPath = path.join(process.cwd(), 'public', 'data', 'all-sites.json');
  
  const sitesData = JSON.parse(fs.readFileSync(sitesPath, 'utf8')) as Record<string, SiteData>;
  const allSitesData = JSON.parse(fs.readFileSync(allSitesPath, 'utf8')) as Record<string, SiteData>;
  
  return <SimpleDashboard initialSites={sitesData} initialAllSites={allSitesData} />;
}
