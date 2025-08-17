const winston = require("winston");
const LokiTransport = require("winston-loki");

const commonOptions = {
  level: "info",
  format: winston.format.combine(
    winston.format.printf(({ level, message }) => {
      return `[${level.toUpperCase()}]: ${message}`;
    })
  )
};

// Using winston for local env
const localConfig = {
  transports: [new winston.transports.Console()]
};

// Using winston-cloudwatch for production
const productionConfig = {
  transports: [
    new LokiTransport({
      host: process.env.LOKI_HOST,
      labels: { app: "ChatInsight" },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: err => console.error(err)
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.simple(),
        winston.format.colorize()
      )
    })
  ]
};

const envLocation = process.env.NODE_ENV || "dev";
const config =
  ["dev", "staging", "production"].includes(envLocation) ?
    productionConfig :
    localConfig;


console.log("config ---------------", config, process.env.NODE_ENV, process.env.LOKI_HOST);
const logger = winston.createLogger({ ...commonOptions, ...config });

module.exports = logger;
