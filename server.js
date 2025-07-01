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
const dashboardRoutes = require('./routes/dashboard');
const UploadController = require('./controllers/uploadController');
const StatusCodes = require('./constants/statusCode')
const userRoutes = require('./routes/User');
// const syncProperties = require('./cron-jobs/syncCRM')
// const { setupWebSocket } = require("./websockets/websocket");

// const seedUsers = require('./seeders/seedUsers');
const http = require("http");

dotenv.config();
connectDB();
const app = express();
const server = http.createServer(app);
// seedUsers();

// setupWebSocket(server); // Attach WebSocket to server
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
    res.send('Empire Infratech Backend Server is healthy');
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


// Auth Routes

app.use('/api/products', productRoutes);

// app.use('/api/contact', contactUsRoutes);

app.use('/api/projects', projectRoutes);

// empire infratech

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

// end empire infratech

// zapier
app.use('/api/zapier', zapierRoutes);
