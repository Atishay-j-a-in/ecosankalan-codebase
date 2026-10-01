const express = require('express');
const MapMarker = require('../models/MapMarker');

const router = express.Router();

const CATEGORY_COLOR = {
  'Waste Basket': 'green',
  'Recycling Bin': 'blue',
  'Recycling Centre': 'purple',
  'Waste Transfer Station': 'orange',
  'Landfill': 'red',
  'Other': 'grey',
};

router.get('/', async (req, res) => {
  try {
    const { north, south, east, west, categories } = req.query;

    if (!north || !south || !east || !west) {
      return res.status(400).json({
        success: false,
        message: 'north, south, east, and west query params are required',
      });
    }

    const n = parseFloat(north);
    const s = parseFloat(south);
    const e = parseFloat(east);
    const w = parseFloat(west);
    if (![n, s, e, w].every(Number.isFinite)) {
      return res.status(400).json({ success: false, message: 'Bounding box must be numeric' });
    }
    if (n < -90 || n > 90 || s < -90 || s > 90 || e < -180 || e > 180 || w < -180 || w > 180) {
      return res.status(400).json({ success: false, message: 'Bounding box out of range' });
    }
    if (n <= s || e <= w) {
      return res.status(400).json({ success: false, message: 'Invalid bounding box: require north>south and east>west' });
    }
    // Prevent full-planet scans.
    if (n - s > 10 || e - w > 10) {
      return res.status(400).json({ success: false, message: 'Bounding box too large. Zoom in.' });
    }

    const filter = {
      isActive: true,
      location: {
        $geoWithin: {
          $box: [
            [w, s],
            [e, n],
          ],
        },
      },
    };

    if (categories) {
      const catList = categories.split(',').map(c => c.trim());
      filter.category = { $in: catList };
    }

    const markers = await MapMarker.find(filter).limit(500).lean();

    const locations = markers.map((m) => ({
      id: `${m.osmType}_${m.osmId}`,
      osmId: m.osmId,
      type: m.osmType,
      lat: m.location.coordinates[1],
      lng: m.location.coordinates[0],
      category: m.category,
      color: CATEGORY_COLOR[m.category] || 'grey',
      name: m.name,
      tags: m.tags,
    }));

    res.status(200).json({ success: true, count: locations.length, locations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load markers' });
  }
});

module.exports = router;
