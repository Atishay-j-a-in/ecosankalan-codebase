const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Bin = require('../models/Bin');

const router = express.Router();

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const distanceMetres = ([lng1, lat1], [lng2, lat2]) => {
  const radius = 6371000;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// FR-12: GET /bins?lat&lng&radius — sorted nearest-first using $near + $2dsphere
router.get('/', async (req, res) => {
  try {
    const lat = toNumber(req.query.lat);
    const lng = toNumber(req.query.lng);
    const rawRadius = toNumber(req.query.radius) ?? 5000;
    const radius = Math.min(20000, Math.max(100, rawRadius));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    if (lat === null || lng === null) {
      return res.status(400).json({ success: false, message: 'lat and lng query params are required' });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: 'lat must be -90..90 and lng -180..180' });
    }

    const userPoint = [lng, lat];
    const query = Bin.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: userPoint },
          $maxDistance: radius,
        },
      },
    });
    // Support mocked models in tests (plain arrays) as well as real Mongoose queries.
    const limited = query && typeof query.limit === 'function' ? query.limit(limit) : query;
    const bins = limited && typeof limited.lean === 'function' ? await limited.lean() : await limited;

    res.status(200).json(bins.map((bin) => ({
      ...bin,
      distanceMetres: distanceMetres(userPoint, bin.location.coordinates),
    })));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load bins' });
  }
});

// FR-11: POST /bins — Admin-only bin creation
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, address, location, types, capacityStatus } = req.body;

    if (!name || !address || !location?.coordinates || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ success: false, message: 'name, address, location.coordinates and types are required' });
    }
    const coords = location.coordinates.map(Number);
    if (
      coords.length !== 2 ||
      !Number.isFinite(coords[0]) || !Number.isFinite(coords[1]) ||
      coords[0] < -180 || coords[0] > 180 || coords[1] < -90 || coords[1] > 90
    ) {
      return res.status(400).json({ success: false, message: 'location.coordinates must be [lng (-180..180), lat (-90..90)]' });
    }

    const bin = await Bin.create({
      name,
      address,
      location: {
        type: 'Point',
        coordinates: coords,
      },
      types,
      capacityStatus,
      createdBy: req.user.userId,
    });

    res.status(201).json(bin);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to create bin' });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const allowed = ['name', 'address', 'types', 'capacityStatus'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.location?.coordinates !== undefined) {
      const coords = req.body.location.coordinates.map(Number);
      if (
        coords.length !== 2 ||
        !Number.isFinite(coords[0]) || !Number.isFinite(coords[1]) ||
        coords[0] < -180 || coords[0] > 180 || coords[1] < -90 || coords[1] > 90
      ) {
        return res.status(400).json({ success: false, message: 'location.coordinates must be [lng (-180..180), lat (-90..90)]' });
      }
      updates.location = { type: 'Point', coordinates: coords };
    }
    const bin = await Bin.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!bin) return res.status(404).json({ success: false, message: 'Bin not found' });
    res.status(200).json(bin);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update bin' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const bin = await Bin.findByIdAndDelete(req.params.id);
    if (!bin) return res.status(404).json({ success: false, message: 'Bin not found' });
    res.status(200).json({ success: true, message: 'Bin deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete bin' });
  }
});

module.exports = router;
