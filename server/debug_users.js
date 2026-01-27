const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");
        
        const users = await User.find({});
        console.log("Total Users:", users.length);
        users.forEach(u => {
            console.log(`- Name: ${u.displayName}, Email: ${u.email}, Uni: '${u.university}', UID: ${u.firebaseUid}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
};

run();
