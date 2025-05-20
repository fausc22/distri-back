const express = require('express');
const comprasController = require('../controllers/comprasController');
const router = express.Router();

// Rutas para gastos
router.get('/obtener-gastos', comprasController.obtenerGastos);
router.get('/obtener-gasto/:gastoId', comprasController.obtenerGasto);
router.get('/verificarComprobanteGasto/:gastoId', comprasController.verificarComprobanteGasto);
router.post('/guardarComprobanteGasto/:gastoId', comprasController.guardarComprobanteGasto);
router.get('/obtenerComprobanteGasto/:gastoId', comprasController.obtenerComprobanteGasto);
router.delete('/eliminarComprobanteGasto/:gastoId', comprasController.eliminarComprobanteGasto);

// Rutas para compras
router.get('/obtener-compras', comprasController.obtenerCompras);
router.get('/obtener-productos-compra/:compraId', comprasController.obtenerProductosCompra);
router.get('/verificarComprobante/:compraId', comprasController.verificarComprobanteCompra);
router.post('/guardarComprobante/:compraId', comprasController.guardarComprobanteCompra);
router.get('/obtenerComprobante/:compraId', comprasController.obtenerComprobanteCompra);
router.delete('/eliminarComprobante/:compraId', comprasController.eliminarComprobanteCompra);

module.exports = router;