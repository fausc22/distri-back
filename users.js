const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');


// Configurar la conexión a la base de datos
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '251199',
    database: 'erp_distri', 
  connectionLimit: 10
});

// Función para crear un usuario en la base de datos
const crearUsuario = async (username, password, rol) => {
  try {
    // Validar el rol
    const rolesValidos = ['GERENTE', 'VENDEDOR', 'EMPLEADO'];
    if (!rolesValidos.includes(rol.toUpperCase())) {
      console.error('Error: El rol ingresado no es válido. Debe ser GERENTE, VENDEDOR o EMPLEADO.');
      return;
    }

    // Encriptar la contraseña con bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar usuario en la base de datos
    const query = `INSERT INTO usuarios (usuario, pass, rol) VALUES (?, ?, ?)`;
    const [result] = await pool.execute(query, [username, hashedPassword, rol.toUpperCase()]);

    console.log(`Usuario "${username}" creado exitosamente con el rol "${rol}".`);
  } catch (error) {
    console.error('Error al crear el usuario:', error.message);
  } finally {
    pool.end(); // Cierra la conexión a la base de datos
  }
};

// Pedir datos del usuario por consola (Ejemplo manual)
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Ingrese el nombre de usuario: ', (username) => {
  readline.question('Ingrese la contraseña: ', (password) => {
    readline.question('Ingrese el rol (GERENTE, VENDEDOR, EMPLEADO): ', (rol) => {
      crearUsuario(username, password, rol);
      readline.close();
    });
  });
});
