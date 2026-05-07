export const notificationService = {
  async initialize() {
    return true;
  },

  async sendHazardAlert() {
    console.log('Notification skipped in Expo Go');
    return true;
  },

  async scheduleLocalNotification() {
    return true;
  },

  async cancelAllNotifications() {
    return true;
  },
};