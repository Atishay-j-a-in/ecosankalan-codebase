/**
 * scripts/seedMarkers.js
 * Fetch waste locations from OSM Overpass API and seed them into the MapMarker collection.
 *
 * Usage: node scripts/seedMarkers.js
 *
 * Fetches data for India by default (configurable via environment variables).
 * Safe to run repeatedly — deduplicates by OSM element ID.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const https = require('https');
const MapMarker = require('../src/models/MapMarker');

const USER_AGENT = 'EcoSankalan/1.0 (India waste map seeder; eco-app)';

function httpsFetch(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + (parsed.search || ''),
      method,
      headers: { ...headers, 'User-Agent': USER_AGENT },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

const buildOverpassQuery = () => `
[out:json][timeout:180][maxsize:536870912];
area["name"="India"]->.india;
(
  node["amenity"="waste_basket"](area.india);
  way["amenity"="waste_basket"](area.india);
  relation["amenity"="waste_basket"](area.india);

  node["amenity"="recycling"](area.india);
  way["amenity"="recycling"](area.india);
  relation["amenity"="recycling"](area.india);

  node["amenity"="waste_disposal"](area.india);
  way["amenity"="waste_disposal"](area.india);
  relation["amenity"="waste_disposal"](area.india);

  node["amenity"="waste_transfer_station"](area.india);
  way["amenity"="waste_transfer_station"](area.india);
  relation["amenity"="waste_transfer_station"](area.india);

  node["amenity"="recycling_centre"](area.india);
  way["amenity"="recycling_centre"](area.india);
  relation["amenity"="recycling_centre"](area.india);

  node["landuse"="landfill"](area.india);
  way["landuse"="landfill"](area.india);
  relation["landuse"="landfill"](area.india);

  node["man_made"="wastewater_plant"](area.india);
  way["man_made"="wastewater_plant"](area.india);
  relation["man_made"="wastewater_plant"](area.india);
);
out center;
`.trim();

const getCoords = (element) => {
  if (element.type === 'node') {
    if (element.lat == null || element.lon == null) return null;
    return [element.lon, element.lat];
  }
  if (element.center) {
    if (element.center.lat == null || element.center.lon == null) return null;
    return [element.center.lon, element.center.lat];
  }
  return null;
};

const categorize = (tags) => {
  if (tags.amenity === 'recycling_centre') return 'Recycling Centre';
  if (tags.amenity === 'recycling') {
    if (tags.recycling_type === 'centre') return 'Recycling Centre';
    return 'Recycling Bin';
  }
  if (tags.amenity === 'waste_transfer_station') return 'Waste Transfer Station';
  if (tags.amenity === 'waste_disposal') return 'Waste Transfer Station';
  if (tags.amenity === 'waste_basket') return 'Waste Basket';
  if (tags.landuse === 'landfill') return 'Landfill';
  if (tags.man_made === 'wastewater_plant') return 'Landfill';
  return 'Other';
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const fetchOverpass = async () => {
  const query = buildOverpassQuery();
  const body = 'data=' + encodeURIComponent(query);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`  Fetching from ${endpoint}...`);
      const res = await httpsFetch(endpoint, 'POST',
        { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      );

      if (res.status === 406) {
        console.warn(`  ${endpoint} returned 406 — trying next endpoint...`);
        continue;
      }

      if (res.status === 429) {
        console.warn(`  ${endpoint} returned 429 (rate limited) — waiting 30s...`);
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }

      if (![200, 201].includes(res.status)) {
        console.warn(`  ${endpoint} returned ${res.status} — trying next...`);
        continue;
      }

      return JSON.parse(res.body);
    } catch (err) {
      console.warn(`  ${endpoint} failed: ${err.message}`);
    }
  }

  throw new Error('All Overpass endpoints failed');
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 600000,
    });
    console.log('Connected to MongoDB\n');

    console.log('Fetching waste locations from Overpass API (within India boundaries)...');

    const data = await fetchOverpass();

    if (!data || !Array.isArray(data.elements)) {
      console.log('No data returned');
      await mongoose.disconnect();
      return;
    }

    console.log(`Received ${data.elements.length} elements\n`);

    let inserted = 0;
    let skipped = 0;

    for (const element of data.elements) {
      const coords = getCoords(element);
      if (!coords) continue;

      const tags = element.tags || {};
      const category = categorize(tags);

      const doc = {
        osmId: element.id,
        osmType: element.type,
        location: { type: 'Point', coordinates: coords },
        category,
        name: tags.name || tags['name:en'] || null,
        tags,
        source: 'overpass',
        isActive: true,
      };

      try {
        await MapMarker.updateOne(
          { osmId: doc.osmId, osmType: doc.osmType },
          { $set: doc },
          { upsert: true }
        );
        inserted++;
      } catch {
        skipped++;
      }
    }

    console.log(`\n=== Seed Complete ===`);
    console.log(`Inserted/updated: ${inserted}, Skipped: ${skipped}`);
    console.log(`Total markers in DB: ${await MapMarker.countDocuments()}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

seed();
