const cron = require('node-cron');
const { exec } = require('child_process');

// exec('npm run backup', (error, stdout, stderr) => {
//     if (error) {
//         console.error(`Backup Error: ${error.message}`);
//         return;
//     }
//     if (stderr) {
//         console.error(`Backup Stderr: ${stderr}`);
//         return;
//     }
//     console.log(`Backup Output: ${stdout}`);
// });

// MongoDB backup every day at 2:30 AM
cron.schedule('0 */6 * * *', () => {
  console.log('Running daily MongoDB backup...');
  exec('npm run backup', (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Backup Stderr: ${stderr}`);
      return;
    }
    console.log(`Backup Output: ${stdout}`);
  });
});
