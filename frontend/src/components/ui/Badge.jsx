import { JOB_STATUS_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../../lib/constants.js';

export const Badge = ({ tone = 'gray', children }) => <span className={`badge badge-${tone}`}>{children}</span>;

const STATUS_TONE = { OPEN: 'blue', IN_PROGRESS: 'amber', RESOLVED: 'green', CLOSED: 'gray' };
const PRIORITY_TONE = { LOW: 'gray', MEDIUM: 'blue', HIGH: 'amber', URGENT: 'red' };
const JOB_TONE = { WAITING: 'gray', ACTIVE: 'blue', RETRYING: 'amber', COMPLETED: 'green', FAILED: 'red' };

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
export const PriorityBadge = ({ priority }) => <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
export const JobStatusBadge = ({ status }) => <Badge tone={JOB_TONE[status]}>{JOB_STATUS_LABEL[status]}</Badge>;
