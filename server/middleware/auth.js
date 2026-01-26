const admin = require('firebase-admin');

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expect "Bearer <token>"
    if (!token) return res.status(401).send("Unauthorized");
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Add user info to request
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(401).send("Invalid Token");
    }
};

module.exports = verifyToken;
