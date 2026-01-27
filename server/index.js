const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;
const mongoose = require('mongoose');
const User = require('./models/User');
const Timetable = require('./models/Timetable');
const Attendance = require('./models/Attendance');
const Todo = require('./models/Todo');
const Semester = require('./models/Semester');
const FocusSession = require('./models/FocusSession');
const libraryRoutes = require('./routes/library');
const discussionRoutes = require('./routes/discussion');
const lostFoundRoutes = require('./routes/lostfound'); // [NEW] LostFound
const chatRoutes = require('./routes/chat'); // [NEW] Chat
const budgetRoutes = require('./routes/budget'); // [NEW] Smart Budgetor
const friendsRoutes = require('./routes/friends'); // [NEW] Friends v2

const admin = require('firebase-admin');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: Load from Environment Variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
    process.exit(1);
  }
} else {
  // Development: Load from local file
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (e) {
    console.error("No serviceAccountKey.json found and FIREBASE_SERVICE_ACCOUNT not set.");
    process.exit(1);
  }
}

// Middleware Imports
const verifyToken = require('./middleware/auth');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// MongoDB Connection
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

mongoose.connect(process.env.MONGODB_URI, clientOptions)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// Middleware to protect routes
// Middleware to protect routes (Imported)

// Basic Route
app.get('/', (req, res) => {
    res.send('Hello from the Server!');
});

// Sync User Endpoint
app.post('/api/users/sync', verifyToken, async (req, res) => {
    const { uid, email, name, picture } = req.user;
    try {
        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            {
                email,
                displayName: name || '',
                photoURL: picture || ''
            },
            { new: true, upsert: true } // Create if not exists, return new doc
        );
        res.status(200).json(user);
    } catch (error) {
        console.error('Error syncing user:', error);
        res.status(500).send('Server Error');
    }
});

// Get User Profile
app.get('/api/users/profile', verifyToken, async (req, res) => {
    const { uid } = req.user;
    try {
        const user = await User.findOne({ firebaseUid: uid });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('Server Error');
    }
});

// Update User Profile
app.put('/api/users/profile', verifyToken, async (req, res) => {
    const { university, branch, semester } = req.body;
    const { uid } = req.user;

    try {
        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            { 
                university, 
                branch, 
                semester,
                isProfileComplete: true,
                // Ensure email and firebaseUid are set if creating new doc
                email: req.user.email || (`no-email-${uid}`),
                displayName: req.user.name || req.user.email || 'Student',
                photoURL: req.user.picture || ''
            },
            { new: true, upsert: true }
        );
        console.log("Profile Updated:", user);
        res.status(200).json(user);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Server Error');
    }
});

// --- TIMETABLE ROUTES ---

// Get User's Timetable
app.get('/api/timetable', verifyToken, async (req, res) => {
    try {
        console.log("Fetching timetable for firebaseUid:", req.user.uid);
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) {
            console.log("User not found for timetable fetch");
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Found user _id:", user._id);
        const userSlots = await Timetable.find({ userId: user._id }).sort({ startTime: 1 });
        console.log("Found slots:", userSlots.length);
        
        res.status(200).json(userSlots);
    } catch (error) {
        console.error('Error fetching timetable:', error);
        res.status(500).send('Server Error');
    }
});



// Add Timetable Slot (Restored)
app.post('/api/timetable', verifyToken, async (req, res) => {
    const { day, startTime, endTime, title, location, type } = req.body;
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) return res.status(404).json({ message: "User not found" });

        const newSlot = new Timetable({
            userId: user._id, 
            day, startTime, endTime, title, location, type
        });
        await newSlot.save();
        res.status(201).json(newSlot);
    } catch (error) {
        console.error('Error creating slot:', error);
        res.status(500).send('Server Error');
    }
});


// Update Timetable Slot
app.put('/api/timetable/:id', verifyToken, async (req, res) => {
    try {
        console.log(`Attempting update for slot ${req.params.id}`);
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) {
            console.log("User not found");
            return res.status(404).json({ message: "User not found" });
        }

        // Ensure slot belongs to user before updating
        const slot = await Timetable.findOne({ _id: req.params.id, userId: user._id });
        if (!slot) {
            console.log(`Slot not found or ownership mismatch. SlotId: ${req.params.id}, UserId: ${user._id}`);
            return res.status(404).json({ message: "Slot not found" });
        }

        console.log("Updating with body:", req.body);
        const updatedSlot = await Timetable.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.status(200).json(updatedSlot);
    } catch (error) {
        console.error('Error updating slot:', error);
        res.status(500).send('Server Error');
    }
});

// Delete Timetable Slot
app.delete('/api/timetable/:id', verifyToken, async (req, res) => {
    try {
        // Need to ensure the slot belongs to the user
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const slot = await Timetable.findOne({ _id: req.params.id, userId: user._id });
        
        if (!slot) return res.status(404).json({ message: "Slot not found" });
        
        await Timetable.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: "Slot deleted" });
    } catch (error) {
        console.error('Error deleting slot:', error);
        res.status(500).send('Server Error');
    }
});


// --- ATTENDANCE ROUTES ---

// Mark Attendance
app.post('/api/attendance', verifyToken, async (req, res) => {
    const { timetableId, date, status } = req.body; // date format YYYY-MM-DD
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        
        const record = await Attendance.findOneAndUpdate(
            { userId: user._id, timetableId, date },
            { status },
            { new: true, upsert: true } // Update if exists (e.g. changing Present to Absent), Create if not
        );
        res.status(200).json(record);
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).send('Server Error');
    }
});

// Get Attendance History (for a date range or all)
app.get('/api/attendance', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        // Optional: filter by query param ?date=YYYY-MM-DD
        const filter = { userId: user._id };
        if (req.query.date) {
            filter.date = req.query.date;
        }
        
        const history = await Attendance.find(filter);
        res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).send('Server Error');
    }
});

// Example Protected Route
app.get('/protected-data', verifyToken, (req, res) => {
    res.send(`Hello ${req.user.email}, this data is secret!`);
});
// --- TODO ROUTES ---

// Sync Daily Personal Tasks
app.post('/api/todos/sync', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Get Today's Day Name (e.g., "Monday") and Date String
        // Note: Using client's timezone would be better, but for MVP we'll rely on server/simple logic
        // Ideally, pass 'date' and 'dayName' from client's local time in body
        const { date, dayName } = req.body; 
        
        if (!date || !dayName) {
            return res.status(400).json({ message: "Date and Day Name required" });
        }

        console.log(`Syncing Todos for User ${user.email} on ${dayName} (${date})`);

        // 1. Find relevant Timetable slots (Personal only)
        const personalSlots = await Timetable.find({ 
            userId: user._id, 
            day: dayName,
            type: 'personal' // Only sync personal stuff. Academic is handled by Attendance.
        });

        console.log(`Found ${personalSlots.length} personal slots for ${dayName}`);

        const createdTasks = [];

        // 2. For each slot, ensure a Todo exists for THIS date
        for (const slot of personalSlots) {
            console.log(`Checking slot: ${slot.title}`);
            const existingTodo = await Todo.findOne({
                userId: user._id,
                originTimetableId: slot._id,
                date: date
            });

            if (!existingTodo) {
                console.log(`Creating new Todo for ${slot.title}`);
                const newTodo = new Todo({
                    userId: user._id,
                    title: slot.title,
                    description: `Auto-generated from Timetable (${slot.startTime} - ${slot.endTime})`,
                    status: 'todo',
                    priority: 'medium',
                    date: date,
                    originTimetableId: slot._id
                });
                await newTodo.save();
                createdTasks.push(newTodo);
            } else {
                console.log(`Todo already exists for ${slot.title}`);
            }
        }

        // 3. Cleanup Orphans: Delete Todos for today that came from a slot that no longer exists
        // (e.g. User deleted the slot from Timetable but the Todo remained)
        const validSlotIds = personalSlots.map(s => s._id.toString());
        
        const todaysAutoTodos = await Todo.find({
            userId: user._id,
            date: date,
            originTimetableId: { $ne: null } // Only check auto-generated ones
        });

        let deletedCount = 0;
        for (const todo of todaysAutoTodos) {
            if (!validSlotIds.includes(todo.originTimetableId.toString())) {
                console.log(`Deleting orphan task: ${todo.title}`);
                await Todo.findByIdAndDelete(todo._id);
                deletedCount++;
            }
        }

        console.log(`Sync complete. Created ${createdTasks.length}, Deleted ${deletedCount} orphans.`);
        res.status(200).json({ 
            message: "Sync complete", 
            created: createdTasks.length,
            deleted: deletedCount 
        });
    } catch (error) {
        console.error('Error syncing todos:', error);
        res.status(500).send('Server Error');
    }
});

// Get Todos (Filter by Date usually, or all)
app.get('/api/todos', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const { date } = req.query;
        const filter = { userId: user._id };
        if (date) filter.date = date;

        const todos = await Todo.find(filter).sort({ createdAt: -1 });
        console.log("Fetched Todos:", JSON.stringify(todos, null, 2));
        res.status(200).json(todos);
    } catch (error) {
        console.error('Error fetching todos:', error);
        res.status(500).send('Server Error');
    }
});

// Create Manual Todo
app.post('/api/todos', verifyToken, async (req, res) => {
    const { title, date, priority } = req.body;
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const newTodo = new Todo({
            userId: user._id,
            title,
            date, // Client should send today's date
            priority: priority || 'medium',
            status: 'todo'
        });
        await newTodo.save();
        res.status(201).json(newTodo);
    } catch (error) {
        console.error('Error creating todo:', error);
        res.status(500).send('Server Error');
    }
});

// Update Todo (Status Move)
app.put('/api/todos/:id', verifyToken, async (req, res) => {
    const { status } = req.body;
    try {
        const updated = await Todo.findByIdAndUpdate(
            req.params.id, 
            { status },
            { new: true }
        );
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating todo:', error);
        res.status(500).send('Server Error');
    }
});

// Delete Todo
app.delete('/api/todos/:id', verifyToken, async (req, res) => {
    try {
        await Todo.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted" });
    } catch (error) {
        console.error('Error deleting todo:', error);
        res.status(500).send('Server Error');
    }
});

// --- SGPA ROUTES ---

// Save a Semester
app.post('/api/semesters', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const { semesterName, courses, sgpa } = req.body;

        const newSem = new Semester({
            userId: user._id,
            semesterName,
            courses,
            sgpa
        });
        await newSem.save();
        res.status(201).json(newSem);
    } catch (error) {
        console.error('Error saving semester:', error);
        res.status(500).send('Server Error');
    }
});

// --- FOCUS ROUTES ---
app.post('/api/focus/session', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const { taskId, duration, type, startTime, endTime } = req.body;

        const newSession = new FocusSession({
            userId: user._id,
            taskId: taskId || null,
            duration,
            type,
            startTime,
            endTime
        });
        await newSession.save();
        res.status(201).json(newSession);
    } catch (error) {
        console.error('Error saving focus session:', error);
        res.status(500).send('Server Error');
    }
});

// Get Today's Focus Stats
app.get('/api/focus/today', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const sessions = await FocusSession.find({
            userId: user._id,
            type: 'focus',
            startTime: { $gte: startOfDay }
        });
        
        console.log(`[Stats] User: ${user.email}, StartOfDay: ${startOfDay}, Sessions Found: ${sessions.length}`);
        
        const totalMinutes = sessions.reduce((acc, curr) => acc + curr.duration, 0);
        console.log(`[Stats] Total Minutes: ${totalMinutes}`);

        res.status(200).json({ totalMinutes });
    } catch (error) {
        console.error('Error fetching focus stats:', error);
        res.status(500).send('Server Error');
    }
});

// Get Semester History (for CGPA)
app.get('/api/semesters', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.user.uid });
        const semesters = await Semester.find({ userId: user._id }).sort({ createdAt: -1 });
        res.status(200).json(semesters);
    } catch (error) {
        console.error('Error fetching semesters:', error);
        res.status(500).send('Server Error');
    }
});

// Delete Semester
app.delete('/api/semesters/:id', verifyToken, async (req, res) => {
    try {
        await Semester.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted" });
    } catch (error) {
        console.error('Error deleting semester:', error);
        res.status(500).send('Server Error');
    }
});

// --- LIBRARY ROUTES ---
app.use('/api/library', libraryRoutes);
app.use('/api/discussion', discussionRoutes);
app.use('/api/lostfound', lostFoundRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/budget', verifyToken, budgetRoutes);
app.use('/api/friends', friendsRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

