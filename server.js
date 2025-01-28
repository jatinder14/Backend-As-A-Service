const express = require('express');
const cors = require('cors');
const connectDB = require('./Database/connection');
const dotenv = require('dotenv');
const multer = require('multer');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const blogRoutes = require('./routes/blog');
const projectRoutes = require('./routes/project');
const contactUsRoutes = require('./routes/contactUs');
const UploadController = require('./controllers/uploadController');
const { verifyToken } = require('./middleware/auth');

dotenv.config();
connectDB();

const app = express();
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// MVL

// Server health check
app.get('/', (req, res) => {
    res.send('MVL Admin Portal Backend');
});

// Auth Routes
app.use('/api/auth', authRoutes);

app.use('/api/products', productRoutes);
app.use('/api/contact', contactUsRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/projects', projectRoutes);

// s3 routes
app.post('/getSignUrlForUpload', verifyToken,
    upload.single('file'),
    uploadController.upload);


// end MVL
