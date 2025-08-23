import winston from 'winston'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

// Tell winston that you want to link the colors
winston.addColors(colors)

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${
          info.stack ? `\n${info.stack}` : ''
        }${
          Object.keys(info).length > 3 
            ? `\n${JSON.stringify(
                Object.fromEntries(
                  Object.entries(info).filter(([key]) => 
                    !['timestamp', 'level', 'message', 'stack'].includes(key)
                  )
                ), 
                null, 
                2
              )}` 
            : ''
        }`
      ),
    ),
  }),
]

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  )
}

// Create the logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports,
})

// Create a stream object with a 'write' function for morgan
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}

// Helper functions for structured logging
export const logError = (message: string, error: Error, context?: Record<string, any>) => {
  logger.error(message, {
    error: error.message,
    stack: error.stack,
    ...context
  })
}

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, context)
}

export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(message, context)
}

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, context)
}