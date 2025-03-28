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
const propertyRoutes = require('./routes/property');
const enquiryRoutes = require('./routes/enquiry');
const careerRoutes = require('./routes/career');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const taskRoutes = require('./routes/task');
const salesRoutes = require('./routes/sales');
const userRoutes = require('./routes/User');
const salaryRoutes = require('./routes/salary');
const zapierRoutes = require('./routes/zapier');
const documentRoutes = require('./routes/Document');
const bankRoutes = require('./routes/bankAccount');
const AttendanceRoutes = require('./routes/Attendance');
const LeaveRoutes = require('./routes/Leave');
const DashboardRoutes = require('./routes/Dashboard');
const NotificationRoutes = require('./routes/notification');
const contactUsRoutes = require('./routes/contactUs');
const hostawayRoutes = require('./routes/hostaway');
const UploadController = require('./controllers/uploadController');
const StatusCodes = require('./constants/statusCode')
const { setupWebSocket } = require("./websockets/websocket");
require('./cron-jobs/syncHostaway');
require('./cron-jobs/ejari-expirattion');
// const seedUsers = require('./seeders/seedUsers');
const http = require("http");

dotenv.config();
connectDB();
const app = express();
const server = http.createServer(app);
// seedUsers();

setupWebSocket(server); // Attach WebSocket to server
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1000 * 1024 * 1024, // limit file size to 1000MB
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
server.listen(PORT, () => {
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

// empire infratech

app.use('/api/property', propertyRoutes);
app.use('/api/property/enquiry', enquiryRoutes);
app.use('/api/careers/application', careerRoutes);



// end empire infratech

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
app.use('/api/user/attendance', AttendanceRoutes);
app.use('/api/user/leave', LeaveRoutes);
app.use('/api/dashboard', DashboardRoutes);

app.use('/api/notification', NotificationRoutes);


// zapier
app.use('/api/zapier', zapierRoutes);
