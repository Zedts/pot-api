const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const lapakRoutes = require('./lapak.routes');
const kategoriRoutes = require('./kategori.routes');
const satuanRoutes = require('./satuan.routes');
const produkRoutes = require('./produk.routes');
const pengirimanRoutes = require('./pengiriman.routes');
const pengirimanDetailRoutes = require('./pengirimanDetail.routes');

const router = Router();

// Health check endpoint (Public)
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running smoothly.',
    timestamp: new Date().toISOString(),
  });
});

// Authentication module routes (Public + /me protected)
router.use('/auth', authRoutes);

// User module routes (Protected with 30-day Bearer token)
router.use('/users', userRoutes);

// Lapak module routes (Protected with 30-day Bearer token & RBAC)
router.use('/lapak', lapakRoutes);

// Kategori module routes (Protected with 30-day Bearer token & RBAC)
router.use('/kategori', kategoriRoutes);

// Satuan module routes (Protected with 30-day Bearer token & RBAC)
router.use('/satuan', satuanRoutes);

// Produk module routes (Protected with 30-day Bearer token & RBAC)
router.use('/produk', produkRoutes);

// Pengiriman module routes (Protected with 30-day Bearer token & RBAC)
router.use('/pengiriman', pengirimanRoutes);

// Pengiriman Detail module routes (Protected with 30-day Bearer token & RBAC)
router.use('/pengiriman-detail', pengirimanDetailRoutes);

module.exports = router;

