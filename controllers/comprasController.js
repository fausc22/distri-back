const db = require('./db');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Definir la ruta de almacenamiento para los comprobantes
const comprobantesPath = path.join(__dirname, "../storage/comprobantes");

// Si no existe la carpeta, la crea
if (!fs.existsSync(comprobantesPath)) {
    fs.mkdirSync(comprobantesPath, { recursive: true });
}

// Configuración de multer para guardar los archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, comprobantesPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        cb(null, `temp-${timestamp}${extension}`);
    },
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
    fileFilter: (req, file, cb) => {
        // Verificar tipos de archivo permitidos
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        
        cb(new Error("El archivo debe ser una imagen (JPG, PNG) o un PDF"));
    }
}).single("comprobante");

// Función para obtener todas las compras
const obtenerCompras = (req, res) => {
    const query = `
        SELECT * FROM compras
        ORDER BY fecha DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener compras:', err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener compras" 
            });
        }
        res.json({ 
            success: true, 
            data: results 
        });
    });
};

// Función para obtener todos los gastos
const obtenerGastos = (req, res) => {
    const query = `
        SELECT * FROM gastos
        ORDER BY fecha DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener gastos:', err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener gastos" 
            });
        }
        res.json({ 
            success: true, 
            data: results 
        });
    });
};

// Función para obtener un gasto específico
const obtenerGasto = (req, res) => {
    const gastoId = req.params.gastoId;
    
    const query = `
        SELECT * FROM gastos
        WHERE id = ?
    `;
    
    db.query(query, [gastoId], (err, results) => {
        if (err) {
            console.error('Error al obtener el gasto:', err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener el gasto" 
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Gasto no encontrado"
            });
        }
        
        res.json({ 
            success: true, 
            data: results[0] 
        });
    });
};

// Función para obtener los productos de una compra (CORREGIDA)
const obtenerProductosCompra = (req, res) => {
    const compraId = req.params.compraId;
    
    const query = `
        SELECT 
            dc.id, 
            dc.compra_id, 
            dc.producto_id, 
            dc.producto_nombre, 
            dc.producto_um, 
            dc.cantidad, 
            dc.precio_costo, 
            dc.precio_venta, 
            dc.subtotal
        FROM detalle_compras dc
        WHERE dc.compra_id = ?
    `;
    
    db.query(query, [compraId], (err, results) => {
        if (err) {
            console.error('Error al obtener productos de la compra:', err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al obtener productos de la compra" 
            });
        }
        // Siempre devolvemos un array como respuesta, incluso si está vacío
        res.json(results || []);
    });
};

// Funciones para verificar comprobantes
const verificarComprobanteCompra = (req, res) => {
    const compraId = req.params.compraId;
    
    fs.readdir(comprobantesPath, (err, files) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: "Error al leer los comprobantes" 
            });
        }
        
        const comprobante = files.find(f => f.startsWith(`COMPRA-${compraId}`));
        
        if (!comprobante) {
            return res.json({ 
                exists: false,
                message: "No hay comprobante para esta compra" 
            });
        }
        
        res.json({ 
            exists: true, 
            message: "Comprobante encontrado",
            filePath: `/comprobantes/${comprobante}` 
        });
    });
};

const verificarComprobanteGasto = (req, res) => {
    const gastoId = req.params.gastoId;
    
    fs.readdir(comprobantesPath, (err, files) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: "Error al leer los comprobantes" 
            });
        }
        
        const comprobante = files.find(f => f.startsWith(`GASTO-${gastoId}`));
        
        if (!comprobante) {
            return res.json({ 
                exists: false,
                message: "No hay comprobante para este gasto" 
            });
        }
        
        res.json({ 
            exists: true, 
            message: "Comprobante encontrado",
            filePath: `/comprobantes/${comprobante}` 
        });
    });
};

// Funciones para obtener comprobantes
const obtenerComprobanteCompra = (req, res) => {
    const compraId = req.params.compraId;
    
    fs.readdir(comprobantesPath, (err, files) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: "Error al leer los comprobantes" 
            });
        }
        
        // Busca un archivo que comience con COMPRA-{ID}
        const comprobante = files.find(f => f.startsWith(`COMPRA-${compraId}`));
        
        if (!comprobante) {
            return res.status(404).json({ 
                success: false, 
                message: "Comprobante no encontrado" 
            });
        }
        
        const filePath = path.join(comprobantesPath, comprobante);
        res.sendFile(filePath);
    });
};

const obtenerComprobanteGasto = (req, res) => {
    const gastoId = req.params.gastoId;
    
    fs.readdir(comprobantesPath, (err, files) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: "Error al leer los comprobantes" 
            });
        }
        
        // Busca un archivo que comience con GASTO-{ID}
        const comprobante = files.find(f => f.startsWith(`GASTO-${gastoId}`));
        
        if (!comprobante) {
            return res.status(404).json({ 
                success: false, 
                message: "Comprobante no encontrado" 
            });
        }
        
        const filePath = path.join(comprobantesPath, comprobante);
        res.sendFile(filePath);
    });
};

// Funciones para guardar comprobantes
const guardarComprobanteCompra = (req, res) => {
    const compraId = req.params.compraId;
    
    upload(req, res, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: err.message || "Error al subir el comprobante" 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: "No se proporcionó ningún archivo" 
            });
        }
        
        // Renombrar el archivo con el formato COMPRA-ID
        const oldPath = path.join(comprobantesPath, req.file.filename);
        const extension = path.extname(req.file.originalname);
        const newFileName = `COMPRA-${compraId}${extension}`;
        const newPath = path.join(comprobantesPath, newFileName);
        
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error('Error al renombrar el archivo:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error al procesar el comprobante" 
                });
            }
            
            // Actualizar la referencia en la base de datos
            const query = `
                UPDATE compras
                SET comprobante = ?
                WHERE id = ?
            `;
            
            db.query(query, [newFileName, compraId], (err) => {
                if (err) {
                    console.error('Error al actualizar la referencia del comprobante:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Error al actualizar la referencia del comprobante" 
                    });
                }
                
                res.json({ 
                    success: true, 
                    message: "Comprobante guardado exitosamente", 
                    filePath: `/comprobantes/${newFileName}` 
                });
            });
        });
    });
};

const guardarComprobanteGasto = (req, res) => {
    const gastoId = req.params.compraId; // Nota: El parámetro debe ser "gastoId"
    
    upload(req, res, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ 
                success: false, 
                message: err.message || "Error al subir el comprobante" 
            });
        }
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: "No se proporcionó ningún archivo" 
            });
        }
        
        // Renombrar el archivo con el formato GASTO-ID
        const oldPath = path.join(comprobantesPath, req.file.filename);
        const extension = path.extname(req.file.originalname);
        const newFileName = `GASTO-${gastoId}${extension}`;
        const newPath = path.join(comprobantesPath, newFileName);
        
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error('Error al renombrar el archivo:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error al procesar el comprobante" 
                });
            }
            
            // Actualizar la referencia en la base de datos
            const query = `
                UPDATE gastos
                SET comprobante = ?
                WHERE id = ?
            `;
            
            db.query(query, [newFileName, gastoId], (err) => {
                if (err) {
                    console.error('Error al actualizar la referencia del comprobante:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Error al actualizar la referencia del comprobante" 
                    });
                }
                
                res.json({ 
                    success: true, 
                    message: "Comprobante guardado exitosamente", 
                    filePath: `/comprobantes/${newFileName}` 
                });
            });
        });
    });
};

// Funciones para eliminar comprobantes
const eliminarComprobanteCompra = (req, res) => {
    const compraId = req.params.compraId;
    
    fs.readdir(comprobantesPath, (err, files) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: "Error al leer los comprobantes" 
            });
        }
        
        const comprobante = files.find(f => f.startsWith(`COMPRA-${compraId}`));
        
        if (!comprobante) {
            return res.status(404).json({ 
                success: false, 
                message: "Comprobante no encontrado" 
            });
        }
        
        const filePath = path.join(comprobantesPath, comprobante);
        
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: "Error al eliminar el comprobante" 
                });
            }
            
            // Actualizar la referencia en la base de datos
            const query = `
                UPDATE compras
                SET comprobante = NULL
                WHERE id = ?
            `;
            
            db.query(query, [compraId], (err) => {
                if (err) {
                    console.error('Error al actualizar la referencia del comprobante:', err);
                    // No fallamos la operación, solo registramos el error
                }
                
                res.json({ 
                    success: true, 
                    message: "Comprobante eliminado correctamente" 
                });
            });
        });
    });
};

const eliminarComprobanteGasto = (req, res) => {
    const gastoId = req.params.gastoId;
    
    fs.readdir(comprobantesPath, (err, files) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: "Error al leer los comprobantes" 
            });
        }
        
        const comprobante = files.find(f => f.startsWith(`GASTO-${gastoId}`));
        
        if (!comprobante) {
            return res.status(404).json({ 
                success: false, 
                message: "Comprobante no encontrado" 
            });
        }
        
        const filePath = path.join(comprobantesPath, comprobante);
        
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: "Error al eliminar el comprobante" 
                });
            }
            
            res.json({ 
                success: true, 
                message: "Comprobante eliminado correctamente" 
            });
        });
    });
};

module.exports = {
    obtenerGastos,
    obtenerGasto,
    obtenerCompras,
    obtenerProductosCompra,
    verificarComprobanteCompra,
    verificarComprobanteGasto,
    obtenerComprobanteCompra,
    obtenerComprobanteGasto,
    guardarComprobanteCompra,
    guardarComprobanteGasto,
    eliminarComprobanteCompra,
    eliminarComprobanteGasto
};