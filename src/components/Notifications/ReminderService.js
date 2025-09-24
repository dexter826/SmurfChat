// Service thông báo nhẹ sử dụng native alerts
import { subMinutes, isAfter, isBefore, differenceInMinutes, format, endOfDay, isWithinInterval, compareAsc } from 'date-fns';

class ReminderService {
  constructor() {
    this.reminders = new Map();
    this.checkInterval = null;
    this.mutedChatIds = new Set();
    this.alertProvider = null;
    this.startReminderCheck();
  }

  // Thiết lập alert provider cho thông báo
  setAlertProvider(alertProvider) {
    this.alertProvider = alertProvider;
  }

  // Bắt đầu kiểm tra nhắc nhở mỗi phút
  startReminderCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000); // Check every minute
  }

  // Thêm nhắc nhở cho một sự kiện
  addReminder(event) {
    if (!event.datetime || !event.reminderMinutes) return;

    const eventTime = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
    const reminderTime = subMinutes(eventTime, event.reminderMinutes);
    const now = new Date();

    // Chỉ thêm nhắc nhở nếu nó ở trong tương lai
    if (isAfter(reminderTime, now)) {
      this.reminders.set(event.id, {
        ...event,
        reminderTime,
        notified: false
      });
    }
  }

  // Xóa một nhắc nhở
  removeReminder(eventId) {
    this.reminders.delete(eventId);
  }

  // Kiểm tra tất cả nhắc nhở và hiển thị thông báo
  checkReminders() {
    const now = new Date();

    this.reminders.forEach((reminder, eventId) => {
      if (!reminder.notified && (isBefore(reminder.reminderTime, now) || reminder.reminderTime.getTime() === now.getTime())) {
        this.showReminderNotification(reminder, this.alertProvider);
        reminder.notified = true;
      }
    });
  }

  // Cập nhật danh sách chat bị tắt thông báo từ bên ngoài
  setMutedChats(ids = []) {
    this.mutedChatIds = new Set(ids);
  }

  // Hiển thị thông báo nhắc nhở
  showReminderNotification(event, alertProvider = null) {
    // Không hiển thị nhắc nhở nếu phòng của sự kiện bị tắt thông báo
    if (event.roomId && this.mutedChatIds.has(event.roomId)) return;

    const eventTime = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
    const now = new Date();
    const timeUntilEvent = differenceInMinutes(eventTime, now);

    try {
      const details = `${event.title}\nPhòng: ${event.roomName}\nThời gian: ${format(eventTime, 'dd/MM/yyyy HH:mm')}\nCòn ${timeUntilEvent} phút nữa` + (event.description ? `\n${event.description}` : '');

      // Use custom modal instead of browser alert
      if (alertProvider && alertProvider.info) {
        alertProvider.info(details, 'Nhắc nhở sự kiện');
      } else {
        // Fallback to browser alert if modal not available
        window.alert(`Nhắc nhở sự kiện\n\n${details}`);
      }
    } catch { }

    // Cũng hiển thị tin nhắn để thu hút sự chú ý ngay lập tức
    // Tùy chọn hiển thị thông báo phụ
  }

  // Cập nhật nhắc nhở khi sự kiện thay đổi
  updateReminders(events) {
    // Clear existing reminders
    this.reminders.clear();

    // Add new reminders
    events.forEach(event => {
      if (!event.deleted && event.status === 'active') {
        this.addReminder(event);
      }
    });
  }

  // Lấy các sự kiện sắp tới (24 giờ tiếp theo)
  getUpcomingEvents() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return Array.from(this.reminders.values())
      .filter(event => {
        const eventTime = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
        return isWithinInterval(eventTime, { start: now, end: tomorrow });
      })
      .sort((a, b) => {
        const timeA = a.datetime.toDate ? a.datetime.toDate() : new Date(a.datetime);
        const timeB = b.datetime.toDate ? b.datetime.toDate() : new Date(b.datetime);
        return compareAsc(timeA, timeB);
      });
  }

  // Hiển thị lịch trình trong ngày
  showDailyAgenda(events) {
    const now = new Date();
    const todayEnd = endOfDay(now);

    const upcomingEvents = events.filter(event => {
      if (event.deleted || event.status !== 'active') return false;

      const eventTime = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
      return isWithinInterval(eventTime, { start: now, end: todayEnd });
    });

    if (upcomingEvents.length > 0) {
      try {
        const lines = upcomingEvents.slice(0, 3).map((event) => {
          const eventTime = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
          return `• ${event.title} (${format(eventTime, 'HH:mm')} - ${event.roomName})`;
        }).join('\n');
        const more = upcomingEvents.length > 3 ? `\n...và ${upcomingEvents.length - 3} sự kiện khác` : '';

        // Use custom modal instead of browser alert
        if (this.alertProvider && this.alertProvider.info) {
          this.alertProvider.info(`${lines}${more}`, 'Lịch trình hôm nay');
        } else {
          // Fallback to browser alert
          window.alert(`Lịch trình hôm nay\n\n${lines}${more}`);
        }
      } catch { }
    }
  }

  // Dọn dẹp
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.reminders.clear();
  }
}

// Create singleton instance
const reminderService = new ReminderService();

export default reminderService;
