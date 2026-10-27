import * as jobService from '../services/job.service.js';
import * as jobLogService from '../services/jobLog.service.js';

export const list = async (req, res) => res.json(await jobLogService.list(req.query));

export async function getById(req, res) {
  res.json({ job: await jobService.getJob(req.user, req.params.queue, req.params.id) });
}

export async function retry(req, res) {
  res.json({ job: await jobService.retryJob(req.params.queue, req.params.id) });
}
