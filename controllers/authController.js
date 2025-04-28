const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./dbPromise');
const dotenv = require('dotenv');

exports.register = async (req, res) => {
    const { username, password, rol } = req.body;
    if (!username || !password || !rol) return res.status(400).json({ message: 'Datos incompletos' });

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await db.execute('INSERT INTO usuarios (usuario, pass, rol) VALUES (?, ?, ?)', [username, hashedPassword, rol]);
        res.json({ message: 'Usuario registrado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar usuario' });
    }
};

exports.login = async (req, res) => {
    const { username, password, remember } = req.body;

    // Corregir consulta SQL (cambiar usuario -> username, pass -> password)
    const [users] = await db.execute('SELECT * FROM usuarios WHERE usuario = ?', [username]);

    if (users.length === 0) return res.status(401).json({ message: 'Usuario no encontrado' });

    const user = users[0];

    // Corregir verificación de contraseña (cambiar pass -> password)
    const validPassword = await bcrypt.compare(password, user.pass);
    if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' });

    // Generar JWT incluyendo el rol
    const accessToken = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Si "remember" está activado, guardar el refreshToken en cookies
    if (remember) {
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict' });
    }

    // **Corrección: incluir el rol en la respuesta**
    res.json({ token: accessToken, role: user.rol });
};


exports.refreshToken = (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'No autorizado' });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });

        const newAccessToken = jwt.sign({ id: user.id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ accessToken: newAccessToken });
    });
};

exports.logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout exitoso' });
};
