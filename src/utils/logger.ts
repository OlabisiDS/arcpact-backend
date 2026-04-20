import { ENV as env } from '../config/env';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

const logger = {
  info: (message: string): void => {
    console.log(formatMessage('INFO', message));
  },

  warn: (message: string): void => {
    console.warn(formatMessage('WARN', message));
  },

  error: (message: string): void => {
    console.error(formatMessage('ERROR', message));
  },

  // Only prints in development mode
  debug: (message: string): void => {
    if (env.nodeEnv === 'development') {
      console.log(formatMessage('INFO', `[DEBUG] ${message}`));
    }
  },
};

export default logger;
