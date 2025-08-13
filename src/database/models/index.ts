// Export all models from a single entry point
export { Message, IMessage } from './Message';
export { ServiceStatus, IServiceStatus } from './ServiceStatus';
export { AdminUser, IAdminUser } from './AdminUser';

// Re-export types for convenience
export type {
  MessageRecord,
  ServiceStatus as ServiceStatusType,
  AdminUser as AdminUserType,
  ServiceType,
  MessageStatus,
  ConnectionStatus,
} from '@/types';