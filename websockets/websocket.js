const express = require('express');
const cors = require('cors');
const connectDB = require('./Database/connection');
const dotenv = require('dotenv');
const multer = require('multer');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/product');
const blogRoutes = require('./routes/blog');
const projectRoutes = require('./routes/project');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const taskRoutes = require('./routes/task');
const salesRoutes = require('./routes/sales');
const userRoutes = require('./routes/User');
const salaryRoutes = require('./routes/salary');
const documentRoutes = require('./routes/Document');
const bankRoutes = require('./routes/bankAccount');
const dailyAttendanceRoutes = require('./routes/dailyAttendance');
const contactUsRoutes = require('./routes/contactUs');
const hostawayRoutes = require('./routes/hostaway');
const UploadController = require('./controllers/uploadController');
const StatusCodes = require('./constants/statusCode')
require('./cron-jobs/syncHostaway');
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app.set("io", io);


// Store connected admin sockets
var adminSockets = new Set();


io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("admin_join", () => {
        console.log("jatinder:", socket.id);
        adminSockets.add(socket.id);

    });

    socket.on("message", (data) => {
        if (data == "admin_join") {
            adminSockets.add(socket.id);
            console.log("Admin joined:", socket.id, adminSockets);
        }
    });

    socket.onAny((event, ...args) => {
        console.log("Received event:", event, args);
    });

    socket.on("disconnect", () => {
        adminSockets.delete(socket.id);
        console.log("Client disconnected:", socket.id);
    });
});
app.set("adminSockets", adminSockets);

dotenv.config();
connectDB();

app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // limit file size to 5MB
    },
});

const uploadController = new UploadController();

// Server health check
app.get('/', (req, res) => {
    res.send('Duomo Admin Portal Backend');
});

// s3 routes
app.post('/getSignUrlForUpload',
    upload.single('file'),
    uploadController.upload);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// MVL

// Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/contact', contactUsRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/projects', projectRoutes);

// end MVL
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/sales', salesRoutes);

// Hostaway routes
app.use('/api/hostaway', hostawayRoutes);

// HR routes
app.use('/api/hr/salary', salaryRoutes);

// user documents
// app.use('/api/user/document', documentRoutes);

// app.use('/api/user/bankdetails', bankRoutes);
app.use('/api/lead/bankdetails', bankRoutes);

// Attendance
app.use('/api/user/daily-attendance', dailyAttendanceRoutes);

// Notification.create({
//     event_type: "order_creation",
//     details: `Order has been Accepted with id: ${orderIds}`,
//     name: userName,
//   })