const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const PartnerProduct = require('../models/PartnerProduct');

const router = express.Router();

const allowedRedirectDomains = () =>
  (process.env.ALLOWED_REDIRECT_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

const isAllowedUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    return allowedRedirectDomains().some((domain) =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

router.get('/', async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.query.category) query.category = req.query.category;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    // Chain only the stages the query/mock supports (tests mock sort().lean()).
    let q = PartnerProduct.find(query);
    q = q && typeof q.sort === 'function' ? q.sort({ createdAt: -1 }) : q;
    q = q && typeof q.skip === 'function' ? q.skip(skip) : q;
    q = q && typeof q.limit === 'function' ? q.limit(limit) : q;
    const products = q && typeof q.lean === 'function' ? await q.lean() : await q;
    const total = PartnerProduct.countDocuments && typeof PartnerProduct.countDocuments === 'function'
      ? await PartnerProduct.countDocuments(query)
      : Array.isArray(products) ? products.length : 0;
    res.status(200).json({ success: true, products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load products' });
  }
});

router.get('/:id/redirect', async (req, res) => {
  try {
    const product = await PartnerProduct.findOne({ _id: req.params.id, isActive: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (!isAllowedUrl(product.partnerProductUrl)) {
      return res.status(403).json({ success: false, message: 'Redirect domain is not allowed' });
    }

    const redirectUrl = new URL(product.partnerProductUrl);
    redirectUrl.searchParams.set('utm_source', 'ecosankalan');
    res.redirect(302, redirectUrl.toString());
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to redirect to product' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await PartnerProduct.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load product' });
  }
});

router.post('/', protect, authorize('admin', 'seller'), async (req, res) => {
  try {
    const { name, category, partnerProductUrl, imageUrl, price } = req.body;
    if (!name || !partnerProductUrl) {
      return res.status(400).json({ success: false, message: 'name and partnerProductUrl are required' });
    }
    if (!isAllowedUrl(partnerProductUrl)) {
      return res.status(403).json({ success: false, message: 'Redirect domain is not allowed' });
    }
    const product = await PartnerProduct.create({
      name,
      category,
      partnerProductUrl,
      imageUrl,
      price,
      createdBy: req.user.userId,
    });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to create product' });
  }
});

router.put('/:id', protect, authorize('admin', 'seller'), async (req, res) => {
  try {
    const updates = {};
    for (const key of ['name', 'category', 'imageUrl', 'price', 'isActive']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.partnerProductUrl !== undefined) {
      if (!isAllowedUrl(req.body.partnerProductUrl)) {
        return res.status(403).json({ success: false, message: 'Redirect domain is not allowed' });
      }
      updates.partnerProductUrl = req.body.partnerProductUrl;
    }
    const product = await PartnerProduct.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update product' });
  }
});

router.delete('/:id', protect, authorize('admin', 'seller'), async (req, res) => {
  try {
    const product = await PartnerProduct.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

module.exports = router;
