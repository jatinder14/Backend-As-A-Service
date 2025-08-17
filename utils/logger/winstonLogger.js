const { createLogger, format, transports } = require("winston");
const LokiTransport = require("winston-loki");
const { combine, timestamp, printf, colorize, json } = format;
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', 'logs');

// console.log("Logs directory:", logsDir,process.env.NODE_ENV);

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Determine if we should write to file based on environment
const isLocalEnvironment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local';

// Create transports array - always include console
const transportsArray = [
  new transports.Console({
    format: combine(
      colorize(),
      logFormat
    )
  })
];

// Only add file transport for local environments
if (isLocalEnvironment) {
  transportsArray.push(
    new transports.File({
      filename: path.join(logsDir, "app.log"),
      format: combine(
        timestamp(),
        logFormat
      )
    })
  );
}
else {
  // Using winston-cloudwatch for production
  transportsArray.push(
    new LokiTransport({
      host: process.env.LOKI_HOST,
      labels: { app: "ChatInsight" },
      json: true,
      format: json(),
      replaceTimestamp: true,
      onConnectionError: err => console.error(err)
    }
    )
  )
}
// Create logger
const logger = createLogger({
  level: "info", // Changed from "silly" to "info" for production use
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: transportsArray
});

logger.info("Logger initialized successfully.");

module.exports = logger;
