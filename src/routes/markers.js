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

    const filter = {
      isActive: true,
      location: {
        $geoWithin: {
          $box: [
            [parseFloat(west), parseFloat(south)],
            [parseFloat(east), parseFloat(north)],
          ],
        },
      },
    };

    if (categories) {
      const catList = categories.split(',').map(c => c.trim());
      filter.category = { $in: catList };
    }

    const markers = await MapMarker.find(filter).lean();

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
