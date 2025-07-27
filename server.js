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
const UploadController = require('./controllers/uploadController');
const StatusCodes = require('./constants/statusCode')
const userRoutes = require('./routes/User');
const { verifyToken } = require('./middleware/auth');
// const syncProperties = require('./cron-jobs/syncCRM')
require('./cron-jobs/mongoBackup')

// const { setupWebSocket } = require("./websockets/websocket");

// const seedUsers = require('./seeders/seedUsers');

const http = require("http");

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);

// seedUsers();

// setupWebSocket(server); // Attach WebSocket to server
app.use(cors({
    origin: '*', 
    // allowedHeaders: '*'
}));

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
app.post('/getSignUrlForUpload', verifyToken,
    upload.single('file'),
    uploadController.upload);

app.use('/summarize', geminiRoutes);

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













// function solution(board) {
//     const m = board.length
//     const n = board[0].length

//     const newBoard = Array.from({ length: m }, () => Array(n).fill('.'))
//     for (let row = 0; row < m; row++) {
//         for (let col = 0; col < n; col++) {
//             if (board[row][col] === '*') {
//                 newBoard[row][col] = '*'
//             }
//         }
//     }

//     for (let col = 0; col < n; col++) {

//         let writeRow = m - 1;
//         for (let row = m - 1; row >= 0; row--) {
//             if (board[row][col] === '*') {
//                 // newBoard[row][col] = '*'
//                 writeRow = row - 1
//             }
//             else if (board[row][col] === '#') {
//                 while (writeRow >= 0 && newBoard[writeRow][col] !== '.') {
//                     writeRow--;
//                 }

//                 if (writeRow >= 0) {
//                     newBoard[writeRow][col] = '#'
//                     writeRow--;
//                 }


//             }

//         }


//     }

//     const directions = [[-1, -1], [-1, 0], [-1, 1],
//     [0, -1], , [0, 0], [0, 1]
//     [1, -1], , [1, 0], [1, 1]
//     ]

//     const toExplode = Array.from({ length: m }, () => Array(n).fill(false))

//     for (let row = 0; row < m; row++) {
//         for (let col = 0; col < n; col++) {
//             if (newBoard[row][col] == '#' && board[row][col] === '*') {
//                 for (let [dx, dy] of directions) {
//                     const r = row + dx
//                     const c = col + dy
//                     if (r >= 0 && r < m && c >= 0 && c < n) {
//                         if (newBoard[r][c] === '#') {
//                             toExplode[r][c] = true;
//                         }
//                     }

//                 }
//                 toExplode[r][c] = true;


//             }


//         }
//     }
//     console.log('toexplode----', toExplode)
//     for (let row = 0; row < m; row++) {
//         for (let col = 0; col < n; col++) {
//             if (toExplode[row][col]) {
//                 newBoard[row][col] = '-'
//             }
//         }
//     }
//     return newBoard
// }
