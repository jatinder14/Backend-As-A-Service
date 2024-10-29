const express = require('express');
const cors = require('cors');
const connectDB = require('./Database/connection');
const dotenv = require('dotenv');
const multer = require('multer');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const taskRoutes = require('./routes/task');
const userRoutes = require('./routes/User');
const salaryRoutes = require('./routes/salary');
const documentRoutes = require('./routes/Document');
const contactUsRoutes = require('./routes/contactUs');
const hostawayRoutes = require('./routes/hostaway');
const UploadController = require('./controllers/uploadController');
const StatusCodes = require('./constants/statusCode')
require('./cron-jobs/syncHostaway');

dotenv.config();
connectDB();

const app = express();
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // limit file size to 5MB
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

// Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/mvl/api/properties', propertyRoutes);
app.use('/mvl/api/contact', contactUsRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/hostaway', hostawayRoutes);

// HR routes
app.use('/api/hr/salary', salaryRoutes);

// user documents
app.use('/api/user/document', documentRoutes);




// Notification.create({
//     event_type: "order_creation",
//     details: `Order has been Accepted with id: ${orderIds}`,
//     name: userName,
//   })