const { Worker } = require('bullmq');
const { getQueueConnectionOptions } = require('../config/queue');
const cacheWarmer = require('../services/cacheWarmer');
const { logFailedJob } = require('../services/dlq.service');
const logger = require('../utils/logger');

const processor = async (job) => {
  const { action } = job.data;
  logger.info(`[Refresh Worker] Processing job ${job.id} - Action: ${action}`);

  if (action === 'warm-all') {
    if (process.env.ENABLE_CACHE_WARMING !== 'true') {
      logger.info(`[Refresh Worker] Cache warming is disabled via environment variable. Skipping.`);
      return;
    }
    await cacheWarmer.warmAll();
  } else {
    throw new Error(`Unsupported action: ${action}`);
  }
};

const initWorker = () => {
  const connectionOpts = getQueueConnectionOptions();
  const worker = new Worker('refresh', processor, {
    ...connectionOpts,
    concurrency: 1,
  });

  worker.on('completed', (job) => {
    logger.info(`[Refresh Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Refresh Worker] Job ${job.id} failed: ${err.message}`);
    if (job) {
      logFailedJob('refresh', job, err);
    }
  });

  return worker;
};

module.exports = { initWorker };
