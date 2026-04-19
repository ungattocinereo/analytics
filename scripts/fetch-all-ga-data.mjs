#!/usr/bin/env node
/**
 * Fetch GA4 analytics data for ALL sites.
 */

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const ALL_PROPERTIES = {
  // Main 5
  'Atrani.ru': 'properties/353046676',
  'Cinereo.it': 'properties/362803366',
  'amalfi.day': 'properties/306713351',
  'guide.amalfi.day': 'properties/533587112',
  'find.amalfi.day': 'properties/531159837',
  // Additional 8
  'Ceramiche Da Mario': 'properties/529437415',
  'Moto Excursions': 'properties/533663747',
  'Katerina': 'properties/532751253',
  'Masha': 'properties/533601370',
  'Landing (menu.band)': 'properties/529373394',
  'Le Palme': 'properties/529531573',
  'Birecto': 'properties/532901805',
  'Vittoria': 'properties/533254667',
};

const TODAY = new Date().toISOString().split('T')[0];
const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

function getAccessToken() {
  let sa = process.env.GA_SERVICE_ACCOUNT;
  if (!sa) {
    const p = path.join(process.env.HOME, '.openclaw/workspace/ga-service-account.json');
    if (fs.existsSync(p)) sa = fs.readFileSync(p, 'utf8');
  }
  if (!sa) throw new Error('GA_SERVICE_ACCOUNT not found');
  if (fs.existsSync(sa)) sa = fs.readFileSync(sa, 'utf8');
  const creds = JSON.parse(sa);

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const token = jwt.sign(payload, creds.private_key, { algorithm: 'RS256' });

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: token,
  });

  return fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
    .then(r => r.json())
    .then(d => d.access_token);
}

async function runReport(accessToken, propertyId, dateRanges, dimensions, metrics) {
  const body = {
    dateRanges: dateRanges,
    dimensions: dimensions.map(d => ({ name: d })),
    metrics: metrics.map(m => ({ name: m })),
  };

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

function extractRows(report) {
  if (!report || !report.rows) return [];
  return report.rows.map(row => ({
    dimensions: row.dimensionValues.map(dv => dv.value),
    metrics: row.metricValues.map(mv => mv.value),
  }));
}

function extractTotal(report, idx) {
  if (!report?.rows?.[0]) return 0;
  return parseFloat(report.rows[0].metricValues[idx]?.value || '0');
}

async function fetchPropertyData(accessToken, name, propertyId) {
  console.log(`Fetching ${name}...`);
  try {
    const [totals7, totals30] = await Promise.all([
      runReport(accessToken, propertyId,
        [{ startDate: SEVEN_DAYS_AGO, endDate: TODAY }],
        [], ['sessions', 'activeUsers', 'screenPageViews', 'averageSessionDuration', 'bounceRate']),
      runReport(accessToken, propertyId,
        [{ startDate: THIRTY_DAYS_AGO, endDate: TODAY }],
        [], ['sessions', 'activeUsers', 'screenPageViews', 'averageSessionDuration', 'bounceRate']),
    ]);

    return {
      name,
      propertyId,
      updatedAt: new Date().toISOString(),
      summary7d: {
        sessions: extractTotal(totals7, 0),
        users: extractTotal(totals7, 1),
        pageViews: extractTotal(totals7, 2),
        avgSessionDuration: Math.round(extractTotal(totals7, 3)),
        bounceRate: Math.round(extractTotal(totals7, 4) * 10) / 10,
      },
      summary30d: {
        sessions: extractTotal(totals30, 0),
        users: extractTotal(totals30, 1),
        pageViews: extractTotal(totals30, 2),
        avgSessionDuration: Math.round(extractTotal(totals30, 3)),
        bounceRate: Math.round(extractTotal(totals30, 4) * 10) / 10,
      },
    };
  } catch (err) {
    console.error(`Error fetching ${name}:`, err.message);
    return {
      name, propertyId,
      updatedAt: new Date().toISOString(),
      error: err.message,
      summary7d: { sessions: 0, users: 0, pageViews: 0, avgSessionDuration: 0, bounceRate: 0 },
      summary30d: { sessions: 0, users: 0, pageViews: 0, avgSessionDuration: 0, bounceRate: 0 },
    };
  }
}

async function main() {
  const accessToken = await getAccessToken();
  console.log('Got access token');

  const dataDir = path.join(process.cwd(), 'public', 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const allData = {};
  for (const [name, propertyId] of Object.entries(ALL_PROPERTIES)) {
    allData[name] = await fetchPropertyData(accessToken, name, propertyId);
  }

  fs.writeFileSync(path.join(dataDir, 'all-sites.json'), JSON.stringify(allData, null, 2));
  console.log('Done! Data written to public/data/all-sites.json');
}

main().catch(err => { console.error(err); process.exit(1); });
