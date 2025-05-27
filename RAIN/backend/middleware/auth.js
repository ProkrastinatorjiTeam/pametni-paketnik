const UserModel = require("../models/userModel");
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tvoj_jwt_secret';

function requireAdmin(req, res, next) {
    if (req.session && req.session.userId) {
        UserModel.findById(req.session.userId)
            .then(user => {
                if (user && user.role === 'admin') {
                    next();
                } else {
                    res.status(403).json({ message: 'Access denied. Admins only.' });
                }
            })
            .catch(() => {
                res.status(500).json({ message: 'Server error' });
            });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
}
async function requireAuth(req, res, next) {
    try {
        if (req.session && req.session.userId) {
            const user = await UserModel.findById(req.session.userId);
            if (!user) {
                return res.status(401).json({ message: 'Not authenticated' });
            }
            req.user = user;
            return next();
        }

        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await UserModel.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: 'Not authenticated' });
    }
}
function requireNotAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return res.status(400).json({ message: 'You are already logged in.' });
    }
    next();
}

module.exports = {
    requireAdmin,
    requireAuth,
    requireNotAuth
};