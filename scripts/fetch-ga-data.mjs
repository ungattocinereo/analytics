#!/usr/bin/env node
/**
 * Fetch GA4 analytics data for all sites.
 * Uses raw JWT + fetch instead of googleapis to avoid auth issues.
 */

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';


const PROPERTIES = {
  'Atrani.ru': 'properties/353046676',
  'Cinereo.it': 'properties/362803366',
  'amalfi.day': 'properties/306713351',
  'guide.amalfi.day': 'properties/533587112',
  'find.amalfi.day': 'properties/531159837',
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
    const [trend, topPages, sources, countries, totals7, totals30] = await Promise.all([
      runReport(accessToken, propertyId,
        [{ startDate: THIRTY_DAYS_AGO, endDate: TODAY }],
        ['date'], ['sessions', 'activeUsers', 'screenPageViews']),
      runReport(accessToken, propertyId,
        [{ startDate: SEVEN_DAYS_AGO, endDate: TODAY }],
        ['pagePath'], ['screenPageViews', 'sessions']),
      runReport(accessToken, propertyId,
        [{ startDate: SEVEN_DAYS_AGO, endDate: TODAY }],
        ['sessionSource'], ['sessions', 'activeUsers']),
      runReport(accessToken, propertyId,
        [{ startDate: SEVEN_DAYS_AGO, endDate: TODAY }],
        ['country'], ['sessions', 'activeUsers']),
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
      trend: extractRows(trend),
      topPages: extractRows(topPages).sort((a, b) => parseFloat(b.metrics[0]) - parseFloat(a.metrics[0])).slice(0, 15),
      sources: extractRows(sources).sort((a, b) => parseFloat(b.metrics[0]) - parseFloat(a.metrics[0])).slice(0, 10),
      countries: extractRows(countries).sort((a, b) => parseFloat(b.metrics[0]) - parseFloat(a.metrics[0])).slice(0, 10),
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
      trend: [], topPages: [], sources: [], countries: [],
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
  for (const [name, propertyId] of Object.entries(PROPERTIES)) {
    allData[name] = await fetchPropertyData(accessToken, name, propertyId);
  }

  fs.writeFileSync(path.join(dataDir, 'sites.json'), JSON.stringify(allData, null, 2));
  for (const [name, data] of Object.entries(allData)) {
    const slug = name.replace(/\./g, '-');
    fs.writeFileSync(path.join(dataDir, `${slug}.json`), JSON.stringify(data, null, 2));
  }

  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
