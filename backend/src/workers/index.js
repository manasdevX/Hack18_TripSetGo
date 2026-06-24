const logger = require('../utils/logger');
const esSyncWorker = require('./esSync.worker');
const itineraryWorker = require('./itinerary.worker');
const emailWorker = require('./email.worker');
const refreshWorker = require('./refresh.worker');
const recommendationWorker = require('./recommendation.worker');

let initialized = false;
const activeWorkers = [];

const startWorkers = () => {
  if (initialized) return;

  if (process.env.RUN_WORKERS === 'false') {
    logger.info('ℹ️ Workers disabled via RUN_WORKERS=false environment variable');
    return;
  }

  logger.info('🚀 Initializing BullMQ background workers...');

  try {
    activeWorkers.push(
      esSyncWorker.initWorker(),
      itineraryWorker.initWorker(),
      emailWorker.initWorker(),
      refreshWorker.initWorker(),
      recommendationWorker.initWorker()
    );
    initialized = true;
    logger.info('✅ All background workers started successfully');
  } catch (err) {
    logger.error(`❌ Failed to initialize workers: ${err.message}`);
  }
};

/**
 * Gracefully close all active workers.
 * Called on SIGTERM / SIGINT so in-flight jobs can complete
 * before the process exits — prevents abandoned or duplicated jobs.
 */
const stopWorkers = async () => {
  if (!activeWorkers.length) return;
  logger.info(`🛑 Stopping ${activeWorkers.length} BullMQ workers gracefully...`);
  await Promise.allSettled(activeWorkers.map((w) => w.close()));
  logger.info('✅ All workers stopped');
};

// Register signal handlers once (idempotent — re-requires are no-ops due to module cache)
process.once('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down workers');
  await stopWorkers();
  process.exit(0);
});

process.once('SIGINT', async () => {
  logger.info('SIGINT received — shutting down workers');
  await stopWorkers();
  process.exit(0);
});

module.exports = { startWorkers, stopWorkers, activeWorkers };
