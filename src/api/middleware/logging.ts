import morgan from 'morgan';
import { logStream } from '@/utils/logger';

export const httpLogger = morgan('combined', { stream: logStream });

export default httpLogger;


