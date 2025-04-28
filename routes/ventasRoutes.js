const express = require('express');
const ventasController = require('../controllers/ventasController');
const router = express.Router();

router.get('/filtrar-cliente', ventasController.filtrarCliente);

router.get('/filtrar-producto', ventasController.filtrarProducto);

router.get('/obtener-vendedor', ventasController.obtenerVendedores);

router.post('/crear-venta', ventasController.nuevaVenta);

router.get('/obtener-ventas', ventasController.obtenerVentas);

router.get('/obtener-venta/:ventaId', ventasController.filtrarVenta);

router.put('/modificar-estado-venta/:ventaId', ventasController.modificarEstadoVenta);

router.get('/obtener-productos-venta/:id', ventasController.filtrarProductosVenta);

router.post('/agregar-producto/:ventaId', ventasController.insertarProductosVentaExistente);

router.put('/actualizar-venta/:ventaId', ventasController.actualizarVenta);

router.delete('/eliminar-producto-venta/:productId', ventasController.eliminarProductoVenta);

router.put('/actualizar-producto-venta/:productId', ventasController.actualizarProductoVenta);


router.post('/generarpdf-listaprecio', ventasController.generarPdfListaPrecio);
router.post('/generarpdf-factura', ventasController.generarPdfFactura);

router.post('/guardarComprobante/:ventaId', ventasController.guardarComprobante);
router.get('/cargarComprobante/:ventaId', ventasController.obtenerComprobante);


module.exports = router;
