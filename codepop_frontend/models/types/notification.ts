export interface Notification {
  NotificationID: number;
  Message: string;
  Timestamp?: string;
  Type: string;
  Global?: boolean;
  UserID: string;
}

export interface CreateNotificationPayload {
  Message: string;
  Timestamp?: string;
  Type: string;
  Global?: boolean;
  UserID: string;
}
