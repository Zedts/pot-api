const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const lapakRoutes = require('./lapak.routes');
const kategoriRoutes = require('./kategori.routes');
const satuanRoutes = require('./satuan.routes');
const produkRoutes = require('./produk.routes');
const pengirimanRoutes = require('./pengiriman.routes');
const pengirimanDetailRoutes = require('./pengirimanDetail.routes');
const penerimaanRoutes = require('./penerimaan.routes');
const stokLapakRoutes = require('./stokLapak.routes');
const counterRoutes = require('./counter.routes');
const penjualanRoutes = require('./penjualan.routes');
const penjualanDetailRoutes = require('./penjualanDetail.routes');
const absensiRoutes = require('./absensi.routes');
const closingRoutes = require('./closing.routes');
const payrollRoutes = require('./payroll.routes');
const slipGajiRoutes = require('./slipGaji.routes');
const storageRoutes = require('./storage.routes');

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

// Penerimaan module routes (Protected with 30-day Bearer token & RBAC)
router.use('/penerimaan', penerimaanRoutes);

// Stok Lapak module routes (Protected with 30-day Bearer token & RBAC)
router.use('/stok-lapak', stokLapakRoutes);

// Counters module routes (Protected with 30-day Bearer token & RBAC)
router.use('/counters', counterRoutes);

// Penjualan module routes (Protected with 30-day Bearer token & RBAC)
router.use('/penjualan', penjualanRoutes);

// Penjualan Detail module routes (Protected with 30-day Bearer token & RBAC)
router.use('/penjualan-detail', penjualanDetailRoutes);

// Absensi module routes (Protected with 30-day Bearer token & RBAC)
router.use('/absensi', absensiRoutes);

// Closing module routes (Protected with 30-day Bearer token & RBAC)
router.use('/closing', closingRoutes);

// Payroll module routes (Protected with 30-day Bearer token & RBAC)
router.use('/payroll', payrollRoutes);

// Slip Gaji module routes (Protected with 30-day Bearer token & RBAC)
router.use('/slip-gaji', slipGajiRoutes);

// Storage module routes (Public file delivery proxy for Cloudflare R2 storage)
router.use('/storage', storageRoutes);

module.exports = router;


