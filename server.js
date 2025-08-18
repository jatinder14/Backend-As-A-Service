const express = require('express');
const cors = require('cors');
const connectDB = require('./Database/connection');
const dotenv = require('dotenv');
const multer = require('multer');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const blogRoutes = require('./routes/blog');
const seoTagRoutes = require('./routes/seoTag');
const projectRoutes = require('./routes/project');
const propertyRoutes = require('./routes/property');
const enquiryRoutes = require('./routes/enquiry');
const careerRoutes = require('./routes/career');
const pageLayoutRoutes = require('./routes/pageLayout');
const zapierRoutes = require('./routes/zapier');
const contactUsRoutes = require('./routes/contactUs');
const dashboardRoutes = require('./routes/Dashboard');
const geminiRoutes = require('./routes/gemini');
const razorpayRoutes = require('./routes/razorpay');
const subscriptionRoutes = require('./routes/subscription');
const orderRoutes = require('./routes/order');
const paymentRoutes = require('./routes/payments');
const planRoutes = require('./routes/plan');
const UploadController = require('./controllers/uploadController');
const userRoutes = require('./routes/User');
const { verifyToken } = require('./middleware/auth');
// const syncProperties = require('./cron-jobs/syncCRM')
require('./cron-jobs/mongoBackup');
require('./cron-jobs/subscriptionManagement').initSubscriptionCronJobs();

// const { setupWebSocket } = require("./websockets/websocket");

// const seedUsers = require('./seeders/seedUsers');
// seedUsers();

const http = require('http');

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

// setupWebSocket(server); // Attach WebSocket to server
// app.use(cors());
app.use(
  cors({
    origin: '*', // Or explicitly: chrome-extension://oekdlegcccpmgoioblacenjdlfffploj
    methods: '*',
    allowedHeaders: '*',
  })
);

// Middleware to parse JSON requests
app.use(express.json());

// for razorpay verify api
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1000 * 1024 * 1024, // limit file size to 1000MB
  },
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const uploadController = new UploadController();

// Server health check
app.get('/', (req, res) => {
  res.send('Empire Infratech Backend Server is healthy');
});

// s3 routes
app.post('/getSignUrlForUpload', verifyToken, upload.single('file'), uploadController.upload);

// LLM routes
app.use('/summarize', geminiRoutes);

// Razorpay routes
app.use('/api/payment/razorpay', razorpayRoutes);

app.use('/api/products', productRoutes);

// app.use('/api/contact', contactUsRoutes);

app.use('/api/projects', projectRoutes);

// empire infratech
// Auth Routes
app.use('/api/auth', authRoutes);

app.use('/api/user', userRoutes);

app.use('/api/property', propertyRoutes);

app.use('/api/dashboard', dashboardRoutes);

app.use('/api/property/enquiry', enquiryRoutes);

app.use('/api/careers/application', careerRoutes);

app.use('/api/blogs', blogRoutes);
app.use('/api/seoTags', seoTagRoutes);

app.use('/api/page-layouts', pageLayoutRoutes);

app.use('/api/contact', contactUsRoutes);

// Subscription, Order, Payment, and Plan routes
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/plans', planRoutes);

// end empire infratech

// zapier
app.use('/api/zapier', zapierRoutes);
