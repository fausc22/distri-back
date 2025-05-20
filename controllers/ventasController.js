const db = require('./db');
const puppeteer = require("puppeteer");
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const multer = require('multer');



//FUNCIONES BASICAS DE LA INTERFAZ DE VENTAS

const filtrarCliente = (req, res) => {
    const searchTerm = req.query.q;
    const query = `
        SELECT 
            *
        FROM clientes WHERE nombre LIKE ?  `;
    db.query(query, [`%${searchTerm}%`], (err, results) => {
        if (err) {
            console.error('Error al obtener:', err);
            res.status(500).send('Error al obtener');
        } else {
            res.json(results);
        }
    });
};

const filtrarProducto = (req, res) => {
    const searchTerm = req.query.q;
    const query = `
        SELECT 
            *
        FROM productos WHERE nombre LIKE ?  `;
    db.query(query, [`%${searchTerm}%`], (err, results) => {
        if (err) {
            console.error('Error al obtener:', err);
            res.status(500).send('Error al obtener');
        } else {
            res.json(results);
        }
    });
};


const obtenerVendedores = (req, res) => {
    
    const query = `
        SELECT 
            nombre
        FROM empleados WHERE rol = 'VENDEDOR'  ORDER BY nombre ASC`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener:', err);
            res.status(500).send('Error al obtener');
        } else {
            res.json(results);
        }
    });
};


const registrarVenta = (pedidoData, callback) => {
    const { cliente_id, cliente_nombre, cliente_telefono, cliente_direccion, cliente_ciudad, cliente_provincia, cliente_condicion, cliente_cuit, tipo_documento, tipo_fiscal, total, estado, empleado_id, empleado_nombre } = pedidoData;

    const registrarVentaQuery = `
        INSERT INTO ventas 
        (fecha, cliente_id, cliente_nombre, cliente_telefono, cliente_direccion, cliente_ciudad, cliente_provincia, cliente_condicion, cliente_cuit, tipo_documento, tipo_fiscal, total, estado, empleado_id, empleado_nombre)
        VALUES 
        (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const ventaValues = [cliente_id, cliente_nombre, cliente_telefono, cliente_direccion, cliente_ciudad, cliente_provincia, cliente_condicion, cliente_cuit, tipo_documento, tipo_fiscal, total, estado, empleado_id, empleado_nombre];

    db.query(registrarVentaQuery, ventaValues, (err, result) => {
        if (err) {
            console.error('Error al insertar el pedido:', err);
            return callback(err);
        }
        callback(null, result.insertId); // Devuelve el ID del pedido recién insertado
    });
};

// Función para insertar los productos del pedido
const insertarProductos = async (ventaId, productos) => {
    const insertProductoQuery = `
        INSERT INTO detalle_ventas (venta_id, producto_id, producto_nombre, producto_um, cantidad, precio, IVA, subtotal) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await Promise.all(productos.map(producto => {
            const { id, nombre, unidad_medida, cantidad, precio, iva, subtotal } = producto;
            const productoValues = [ventaId, id, nombre, unidad_medida, cantidad, precio, iva, subtotal];

            return new Promise((resolve, reject) => {
                db.query(insertProductoQuery, productoValues, (err, result) => {
                    if (err) {
                        console.error('Error al insertar el producto del pedido:', err);
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        }));
        return null;
    } catch (error) {
        return error;
    }
};




const nuevaVenta = (req, res) => {
    const { cliente_id, cliente_nombre, cliente_telefono, cliente_direccion, cliente_ciudad, cliente_provincia, cliente_condicion, cliente_cuit, tipo_documento, tipo_fiscal, total, estado, empleado_id, empleado_nombre, productos } = req.body;
    

    registrarVenta({
        cliente_id, cliente_nombre, cliente_telefono, cliente_direccion, cliente_ciudad, cliente_provincia, cliente_condicion, cliente_cuit, tipo_documento, tipo_fiscal, total, estado, empleado_id, empleado_nombre
    }, async (err, ventaId) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al insertar el pedido' });
        }

        const errorProductos = await insertarProductos(ventaId, productos);
        if (errorProductos) {
            return res.status(500).json({ success: false, message: 'Error al insertar los productos del pedido' });
        }

        res.json({ success: true, message: 'Pedido y productos insertados correctamente', ventaId });
    });

    
    
};


const obtenerVentas = (req, res) => {
    
    const query = `
        SELECT 
            id, DATE_FORMAT(fecha, '%d-%m-%Y // %H:%i:%s') AS fecha, cliente_id, cliente_nombre, cliente_telefono, cliente_direccion, cliente_ciudad, cliente_provincia, cliente_condicion, cliente_cuit, tipo_documento, tipo_fiscal, total, estado, empleado_id, empleado_nombre, cae_id, cae_fecha
        FROM ventas ORDER BY fecha ASC`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener:', err);
            res.status(500).send('Error al obtener');
        } else {
            res.json(results);
        }
    });
};

const filtrarVenta = (req, res) => {
    const ventaId = req.params.ventaId;
    const query = `
        SELECT 
            *
        FROM ventas WHERE id = ? `;
    db.query(query, [ventaId], (err, results) => {
        if (err) {
            console.error('Error ejecutando la consulta:', err);
            res.status(500).send('Error en el servidor');
            return;
        }
        res.json(results);
    });
};

const filtrarProductosVenta = (req, res) => {
    const ventaId = req.params.id;

    // Consulta SQL para obtener productos del pedido
    const query = `
        SELECT id, venta_id, producto_id, producto_nombre, producto_um, cantidad,  precio, iva, subtotal FROM detalle_ventas
        WHERE venta_id = ?
    `;
    
    db.query(query, [ventaId], (err, results) => {
        if (err) {
            console.error('Error al obtener productos del pedido:', err);
            return res.status(500).json({ error: 'Error al obtener productos del pedido' });
        }
        res.json(results);
    });
};


const modificarEstadoVenta = (req, res) => {
    const ventaId = req.params.ventaId;
    const { estado } = req.body;
    const query = `
        UPDATE ventas
        SET estado = ?
        WHERE id = ?
    `;

    db.query(query, [estado, ventaId], (err, result) => {
        if (err) {
            console.error('Error al modificar el estado de la venta:', err);
            return (err);
        }
        res.json({ success: true, message: 'Estado de la venta modificado correctamente'});
    });
}


const insertarProductosVentaExistente = (req, res) => {
    const ventaId = req.params.ventaId;
    const { producto_id, producto_nombre, producto_um, cantidad, precio, iva, subtotal } = req.body;

    

    const query = `
        INSERT INTO detalle_ventas (venta_id, producto_id, producto_nombre, producto_um, cantidad, precio, IVA, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [ventaId, producto_id, producto_nombre, producto_um, cantidad, precio, iva, subtotal], (err, results) => {
        if (err) {
            console.error('Error al insertar el producto:', err);
            return res.status(500).json({ success: false, message: "Error al insertar el producto" });
        }
        res.json({ success: true, message: "Producto agregado correctamente", data: results });
    });
};


const actualizarProductoVenta = (req, res) => {
    const { cantidad, precio, iva, subtotal} = req.body;
    const productId = req.params.productId;

    const query = `
        UPDATE detalle_ventas SET cantidad = ?, precio = ?, IVA = ?, subtotal = ? WHERE id = ? 
    `;

    db.query(query, [cantidad, precio, iva, subtotal, productId], (err, result) => {
        if (err) {
            console.error('Error al actualizar el pedido:', err);
            return res.status(500).json({ success: false, message: 'Error al actualizar el pedido' });
        }
        res.json({ success: true, message: 'Pedido actualizado correctamente' });
    });

}

const eliminarProductoVenta = (req, res) => {
    const productId = req.params.productId;

    const query = `
        DELETE FROM detalle_ventas WHERE id = ? 
    `;

    db.query(query, [productId], (err, result) => {
        if (err) {
            console.error('Error al actualizar el pedido:', err);
            return res.status(500).json({ success: false, message: 'Error al actualizar el pedido' });
        }
        res.json({ success: true, message: 'Pedido actualizado correctamente' });
    });

}


const actualizarVenta = (req, res) => {
    const ventaId = req.params.ventaId;
    const { total } = req.body;
    const query = `
        UPDATE ventas SET total = ? WHERE id = ?
    `;

    db.query(query, [total, ventaId], (err, result) => {
        if (err) {
            console.error('Error al actualizar el pedido:', err);
            return res.status(500).json({ success: false, message: 'Error al actualizar el pedido' });
        }
        res.json({ success: true, message: 'Pedido actualizado correctamente' });
    });
}



const generarPdfFactura = async (req, res) => {
    const { venta, productos } = req.body;

    if (!venta || productos.length === 0) {
        return res.status(400).json({ error: "Datos insuficientes para generar el PDF" });
    }

    // Ruta de la plantilla HTML
    const templatePath = path.join(__dirname, "../resources/documents/factura.html");

    if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: "Plantilla HTML no encontrada" });
    }

    try {
        // Leer y reemplazar la plantilla HTML
        let htmlTemplate = fs.readFileSync(templatePath, "utf8");

        htmlTemplate = htmlTemplate
            .replace("{{fecha}}", venta.fecha)
            .replace("{{cliente_nombre}}", venta.cliente_nombre)
            .replace("{{cliente_cuit}}", venta.cliente_cuit || "No informado")
            .replace("{{cliente_cativa}}", venta.cliente_condicion || "No informado");

        const itemsHTML = productos
            .map(
                (producto) => `
                <tr>
                    <td>${producto.producto_id}</td>
                    <td>${producto.producto_nombre}</td>
                    <td>${producto.producto_um}</td>
                    <td>${producto.cantidad}</td>
                    <td style="text-align: right;">$${producto.precio}</td>
                    <td style="text-align: right;">$${producto.iva}</td>
                    <td style="text-align: right;">$${producto.subtotal}</td>

                </tr>`
            )
            .join("");

        htmlTemplate = htmlTemplate.replace("{{items}}", itemsHTML);
        
        const subtotalPdf = productos.reduce((acc, item) => acc + (parseFloat(item.subtotal) || 0), 0).toFixed(2);
        const ivaPdf = productos.reduce((acc, item) => acc + (parseFloat(item.iva) || 0), 0).toFixed(2);
        const totalPdf = productos.reduce((acc, item) => acc + (parseFloat(item.subtotal) || 0) + (parseFloat(item.iva) || 0), 0).toFixed(2);

        htmlTemplate = htmlTemplate.replace("{{subtotal}}", subtotalPdf);
        htmlTemplate = htmlTemplate.replace("{{iva}}", ivaPdf);
        htmlTemplate = htmlTemplate.replace("{{total}}", totalPdf);


        // Iniciar Puppeteer y generar PDF
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        await page.setContent(htmlTemplate, { waitUntil: "networkidle0" }); // ⬅️ Espera hasta que la página cargue completamente
        const pdfBuffer = await page.pdf({ format: "A4" });

        await browser.close();

        // Configurar la respuesta
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Factura_${venta.cliente_nombre}.pdf"`);

        
        res.end(pdfBuffer); // ⬅️ Usa res.end() en lugar de res.send() para archivos binarios
    } catch (error) {
        console.error("Error generando PDF:", error);
        res.status(500).json({ error: "Error al generar el PDF" });
    }
};







const generarPdfListaPrecio = async (req, res) => {
    const { cliente, productos } = req.body;

    if (!cliente || productos.length === 0) {
        return res.status(400).json({ error: "Datos insuficientes para generar el PDF" });
    }

    // Ruta de la plantilla HTML
    const templatePath = path.join(__dirname, "../resources/documents/lista_precio.html");

    if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: "Plantilla HTML no encontrada" });
    }

    try {
        // Leer y reemplazar la plantilla HTML
        let htmlTemplate = fs.readFileSync(templatePath, "utf8");

        htmlTemplate = htmlTemplate
            .replace("{{fecha}}", new Date().toLocaleDateString())
            .replace("{{cliente_nombre}}", cliente.nombre)
            .replace("{{cliente_cuit}}", cliente.cuit || "No informado")
            .replace("{{cliente_cativa}}", cliente.condicion_iva || "No informado");

        const itemsHTML = productos
            .map(
                (producto) => `
                <tr>
                    <td>${producto.id}</td>
                    <td>${producto.nombre}</td>
                    <td>${producto.unidad_medida}</td>
                    <td>${producto.cantidad}</td>
                    <td style="text-align: right;">$${producto.precio}</td>
                    <td style="text-align: right;">$${producto.iva}</td>
                    <td style="text-align: right;">$${producto.subtotal}</td>

                </tr>`
            )
            .join("");

        htmlTemplate = htmlTemplate.replace("{{items}}", itemsHTML);

        // Iniciar Puppeteer y generar PDF
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        await page.setContent(htmlTemplate, { waitUntil: "networkidle0" }); // ⬅️ Espera hasta que la página cargue completamente
        const pdfBuffer = await page.pdf({ format: "A4" });

        await browser.close();

        // Configurar la respuesta
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Lista_Precios_${cliente.nombre}.pdf"`);
        
        res.end(pdfBuffer); // ⬅️ Usa res.end() en lugar de res.send() para archivos binarios
    } catch (error) {
        console.error("Error generando PDF:", error);
        res.status(500).json({ error: "Error al generar el PDF" });
    }
};



const comprobantesPath = path.join(__dirname, "../storage/comprobantes");

// Si no existe la carpeta, la crea
if (!fs.existsSync(comprobantesPath)) {
    fs.mkdirSync(comprobantesPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, comprobantesPath);
    },
    filename: (req, file, cb) => {
        const ventaId = req.params.ventaId;
        const extension = path.extname(file.originalname);
        cb(null, `VENTA-${ventaId}${extension}`);
    },
});

const upload = multer({ storage }).single("comprobante");

// ⬇️ Cargar comprobante
const guardarComprobante = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Error al subir el comprobante" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No se proporcionó ningún archivo" });
        }

        const filePath = `/comprobantes/${req.file.filename}`;
        res.json({ success: true, message: "Comprobante guardado exitosamente", filePath });
    });
};

// ⬇️ Ver comprobante

const obtenerComprobante = (req, res) => {
    const ventaId = req.params.ventaId;

    fs.readdir(comprobantesPath, (err, files) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error al leer los comprobantes" });
        }

        // Buscar un archivo que comience con VENTA-{ID}
        const comprobante = files.find(f => f.startsWith(`VENTA-${ventaId}`));
        if (!comprobante) {
            return res.status(404).json({ success: false, message: "Comprobante no encontrado" });
        }

        const filePath = path.join(comprobantesPath, comprobante);
        res.sendFile(filePath);
    });
};


const generarPdfFacturasMultiples = async (req, res) => {
    const { ventasIds } = req.body;
    const db = require('./db'); // Ajusta esto a tu ruta de conexión
    
    if (!ventasIds || !Array.isArray(ventasIds) || ventasIds.length === 0) {
        return res.status(400).json({ error: "Debe proporcionar al menos un ID de venta válido" });
    }

    try {
        // Array para almacenar todos los buffers de PDFs
        const pdfBuffers = [];
        
        // Iniciar Puppeteer
        const browser = await puppeteer.launch({ headless: "new" });

        // Procesar cada venta secuencialmente
        for (let i = 0; i < ventasIds.length; i++) {
            const ventaId = ventasIds[i];
            
            // Obtener información de la venta utilizando promisify para el enfoque de callback
            const getVenta = () => {
                return new Promise((resolve, reject) => {
                    db.query('SELECT * FROM ventas WHERE id = ?', [ventaId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });
            };
            
            const getProductos = () => {
                return new Promise((resolve, reject) => {
                    db.query('SELECT * FROM detalle_ventas WHERE venta_id = ?', [ventaId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });
            };
            
            try {
                const ventaRows = await getVenta();
                
                if (ventaRows.length === 0) {
                    console.warn(`Venta con ID ${ventaId} no encontrada, continuando con las siguientes`);
                    continue;
                }
                
                const venta = ventaRows[0];
                const productos = await getProductos();
                
                if (productos.length === 0) {
                    console.warn(`No se encontraron productos para la venta con ID ${ventaId}, continuando`);
                    continue;
                }
                
                // Generar el PDF para esta venta (usando tu código existente)
                const templatePath = path.join(__dirname, "../resources/documents/factura.html");
                
                // ... resto del código del template igual que en tu función generarPdfFactura
                
                let htmlTemplate = fs.readFileSync(templatePath, "utf8");

                htmlTemplate = htmlTemplate
                    .replace("{{fecha}}", venta.fecha)
                    .replace("{{cliente_nombre}}", venta.cliente_nombre)
                    .replace("{{cliente_cuit}}", venta.cliente_cuit || "No informado")
                    .replace("{{cliente_cativa}}", venta.cliente_condicion || "No informado");

                const itemsHTML = productos
                    .map(
                        (producto) => `
                        <tr>
                            <td>${producto.producto_id}</td>
                            <td>${producto.producto_nombre}</td>
                            <td>${producto.producto_um}</td>
                            <td>${producto.cantidad}</td>
                            <td style="text-align: right;">$${producto.precio}</td>
                            <td style="text-align: right;">$${producto.iva}</td>
                            <td style="text-align: right;">$${producto.subtotal}</td>
                        </tr>`
                    )
                    .join("");

                htmlTemplate = htmlTemplate.replace("{{items}}", itemsHTML);
                
                const subtotalPdf = productos.reduce((acc, item) => acc + (parseFloat(item.subtotal) || 0), 0).toFixed(2);
                const ivaPdf = productos.reduce((acc, item) => acc + (parseFloat(item.iva) || 0), 0).toFixed(2);
                const totalPdf = productos.reduce((acc, item) => acc + (parseFloat(item.subtotal) || 0) + (parseFloat(item.iva) || 0), 0).toFixed(2);

                htmlTemplate = htmlTemplate.replace("{{subtotal}}", subtotalPdf);
                htmlTemplate = htmlTemplate.replace("{{iva}}", ivaPdf);
                htmlTemplate = htmlTemplate.replace("{{total}}", totalPdf);

                // Generar PDF individual para esta venta
                const page = await browser.newPage();
                await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });
                const pdfBuffer = await page.pdf({ format: "A4" });
                await page.close();
                
                // Almacenar el buffer del PDF
                pdfBuffers.push(pdfBuffer);
            } catch (error) {
                console.error(`Error procesando venta ID ${ventaId}:`, error);
                // Continúa con las siguientes ventas
            }
        }
        
        await browser.close();

        if (pdfBuffers.length === 0) {
            return res.status(404).json({ error: "No se pudieron generar PDFs para las ventas seleccionadas" });
        }

        // Combinar todos los PDFs usando pdf-lib
        const { PDFDocument } = require('pdf-lib');
        const mergedPdf = await PDFDocument.create();
        
        for (const pdfBuffer of pdfBuffers) {
            const pdf = await PDFDocument.load(pdfBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        
        const mergedPdfBuffer = await mergedPdf.save();

        // Configurar la respuesta
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Facturas_Multiples.pdf"`);
        res.end(Buffer.from(mergedPdfBuffer));
        
    } catch (error) {
        console.error("Error generando PDFs múltiples:", error);
        res.status(500).json({ error: "Error al generar los PDFs múltiples" });
    }
};




module.exports = {
    filtrarCliente,
    obtenerVendedores,
    filtrarProducto,
    nuevaVenta,
    obtenerVentas,
    filtrarVenta,
    modificarEstadoVenta,
    filtrarProductosVenta,
    insertarProductosVentaExistente,
    actualizarVenta,
    eliminarProductoVenta,
    actualizarProductoVenta,
    generarPdfListaPrecio,
    generarPdfFactura,
    guardarComprobante,
    obtenerComprobante,
    generarPdfFacturasMultiples
};