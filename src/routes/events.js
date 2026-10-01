const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');

const router = express.Router();

const publicEvent = (event) => {
  const eventObject = event.toObject ? event.toObject() : event;
  const rsvpCount = eventObject.rsvpList?.length || 0;
  delete eventObject.rsvpList;
  delete eventObject.__v;
  return { ...eventObject, rsvpCount };
};

const isValidLngLat = (coords) =>
  Array.isArray(coords) &&
  coords.length === 2 &&
  Number.isFinite(Number(coords[0])) &&
  Number.isFinite(Number(coords[1])) &&
  Number(coords[0]) >= -180 &&
  Number(coords[0]) <= 180 &&
  Number(coords[1]) >= -90 &&
  Number(coords[1]) <= 90;

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      Event.find({ isCancelled: false })
        .sort({ eventDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments({ isCancelled: false }),
    ]);
    res.status(200).json({
      success: true,
      events: events.map(publicEvent),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load events' });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const events = await Event.find({
      isCancelled: false,
      eventDate: { $gte: new Date() },
    }).sort({ eventDate: 1 }).lean();

    res.status(200).json(events.map(publicEvent));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load upcoming events' });
  }
});

router.post('/', protect, authorize('admin', 'ngo'), async (req, res) => {
  try {
    const { title, description, address, location, eventDate, organiser, bonusPoints } = req.body;
    const parsedDate = new Date(eventDate);

    if (!title || !description || !address || !location?.coordinates || !organiser || Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'title, description, address, location.coordinates, eventDate and organiser are required' });
    }
    if (!isValidLngLat(location.coordinates)) {
      return res.status(400).json({ success: false, message: 'location.coordinates must be [lng (-180..180), lat (-90..90)]' });
    }

    if (parsedDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'eventDate must be in the future' });
    }

    const cappedBonus = bonusPoints == null ? 50 : Math.min(500, Math.max(0, Number(bonusPoints) || 0));

    const event = await Event.create({
      title,
      description,
      address,
      location: { type: 'Point', coordinates: location.coordinates.map(Number) },
      eventDate: parsedDate,
      organiser,
      bonusPoints: cappedBonus,
      createdBy: req.user.userId,
    });

    res.status(201).json(publicEvent(event));
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to create event' });
  }
});

router.post('/:id/rsvp', protect, async (req, res) => {
  try {
    const finder = Event.findById(req.params.id);
    const event = finder && typeof finder.select === 'function'
      ? await finder.select('isCancelled eventDate bonusPoints rsvpList')
      : await finder;

    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.isCancelled) return res.status(400).json({ success: false, message: 'Event is cancelled' });
    if (event.eventDate < new Date()) return res.status(400).json({ success: false, message: 'Event is already over' });

    // Single atomic step: only the first concurrent request modifies the doc.
    const update = await Event.updateOne(
      { _id: event._id, rsvpList: { $ne: req.user.userId }, isCancelled: false, eventDate: { $gte: new Date() } },
      { $addToSet: { rsvpList: req.user.userId } }
    );

    if (!update || update.modifiedCount === 0) {
      return res.status(409).json({ success: false, message: 'Already RSVP’d for this event' });
    }

    // Credit points only when the RSVP actually succeeded (prevents double-credit races).
    // Note: points are an RSVP incentive; attendance verification can be added as FR-14b.
    const bonus = Math.min(500, Math.max(0, Number(event.bonusPoints) || 0));
    if (bonus > 0) {
      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { ecoPoints: bonus, totalPointsEarned: bonus },
      });
    }

    res.status(200).json({
      success: true,
      message: 'RSVP confirmed',
      pointsAwarded: bonus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to RSVP for event' });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const allowed = ['title', 'description', 'address', 'organiser', 'eventDate', 'isCancelled', 'bonusPoints'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.eventDate !== undefined) {
      const parsed = new Date(updates.eventDate);
      if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
        return res.status(400).json({ success: false, message: 'eventDate must be a valid future date' });
      }
      updates.eventDate = parsed;
    }
    if (updates.bonusPoints !== undefined) {
      updates.bonusPoints = Math.min(500, Math.max(0, Number(updates.bonusPoints) || 0));
    }
    if (req.body.location?.coordinates !== undefined) {
      if (!isValidLngLat(req.body.location.coordinates)) {
        return res.status(400).json({ success: false, message: 'location.coordinates must be [lng (-180..180), lat (-90..90)]' });
      }
      updates.location = { type: 'Point', coordinates: req.body.location.coordinates.map(Number) };
    }
    const event = await Event.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.status(200).json({ success: true, event: publicEvent(event) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update event' });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // Soft-delete so RSVP history and points audit trail stay intact.
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $set: { isCancelled: true } },
      { new: true }
    );
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.status(200).json({ success: true, message: 'Event cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel event' });
  }
});

module.exports = router;
