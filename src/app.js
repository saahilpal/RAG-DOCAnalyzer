const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const routes = require('./routes');
const { enforceOriginForMutations } = require('./middlewares/originGuard');
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = env.corsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        // exact match
        if (origin === allowedOrigin) return true;

        // allow Vercel preview subdomains safely
        if (
          allowedOrigin.includes('vercel.app') &&
          origin.endsWith('.vercel.app')
        ) {
          return true;
        }

        return false;
      });

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(enforceOriginForMutations);

app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    },
  }),
);

app.use(morgan(env.isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: env.maxRequestBodySize }));
app.use(express.urlencoded({ extended: false, limit: env.maxRequestBodySize }));
app.use(cookieParser());

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
