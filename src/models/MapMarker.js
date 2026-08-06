const mongoose = require('mongoose');

const mapMarkerSchema = new mongoose.Schema(
  {
    osmId: { type: Number, required: true },
    osmType: { type: String, enum: ['node', 'way', 'relation'], required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    category: { type: String, required: true, index: true },
    name: { type: String, trim: true, default: null },
    tags: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: String, default: 'overpass' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

mapMarkerSchema.index({ osmId: 1, osmType: 1 }, { unique: true });
mapMarkerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('MapMarker', mapMarkerSchema);
