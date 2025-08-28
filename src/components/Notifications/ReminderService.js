// Lightweight notification using native alerts for now
import { CalendarOutlined } from '@ant-design/icons';
import moment from 'moment';

class ReminderService {
  constructor() {
    this.reminders = new Map();
    this.checkInterval = null;
    this.mutedChatIds = new Set();
    this.startReminderCheck();
  }

  // Start checking for reminders every minute
  startReminderCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000); // Check every minute
  }

  // Add a reminder for an event
  addReminder(event) {
    if (!event.datetime || !event.reminderMinutes) return;

    const eventTime = moment(event.datetime.toDate ? event.datetime.toDate() : event.datetime);
    const reminderTime = eventTime.clone().subtract(event.reminderMinutes, 'minutes');

    // Only add reminder if it's in the future
    if (reminderTime.isAfter(moment())) {
      this.reminders.set(event.id, {
        ...event,
        reminderTime: reminderTime.toDate(),
        notified: false
      });
    }
  }

  // Remove a reminder
  removeReminder(eventId) {
    this.reminders.delete(eventId);
  }

  // Check all reminders and show notifications
  checkReminders() {
    const now = moment();

    this.reminders.forEach((reminder, eventId) => {
      if (!reminder.notified && moment(reminder.reminderTime).isSameOrBefore(now)) {
        this.showReminderNotification(reminder);
        reminder.notified = true;
      }
    });
  }

  // Update per-chat mute set from outside
  setMutedChats(ids = []) {
    this.mutedChatIds = new Set(ids);
  }

  // Show reminder notification
  showReminderNotification(event) {
    // Do not show reminders if the event's room is muted
    if (event.roomId && this.mutedChatIds.has(event.roomId)) return;
    const eventTime = moment(event.datetime.toDate ? event.datetime.toDate() : event.datetime);
    const timeUntilEvent = eventTime.diff(moment(), 'minutes');

    try {
      // Replace with a custom toast system later
      const details = `${event.title}\nPhòng: ${event.roomName}\nThời gian: ${eventTime.format('DD/MM/YYYY HH:mm')}\nCòn ${timeUntilEvent} phút nữa` + (event.description ? `\n${event.description}` : '');
      window.alert(`Nhắc nhở sự kiện\n\n${details}`);
    } catch { }

    // Also show a message for immediate attention
    // Optionally show a secondary notice
  }

  // Update reminders when events change
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

  // Get upcoming events (next 24 hours)
  getUpcomingEvents() {
    const now = moment();
    const tomorrow = now.clone().add(24, 'hours');

    return Array.from(this.reminders.values())
      .filter(event => {
        const eventTime = moment(event.datetime.toDate ? event.datetime.toDate() : event.datetime);
        return eventTime.isBetween(now, tomorrow);
      })
      .sort((a, b) => {
        const timeA = moment(a.datetime.toDate ? a.datetime.toDate() : a.datetime);
        const timeB = moment(b.datetime.toDate ? b.datetime.toDate() : b.datetime);
        return timeA.diff(timeB);
      });
  }

  // Show daily agenda
  showDailyAgenda(events) {
    const upcomingEvents = events.filter(event => {
      if (event.deleted || event.status !== 'active') return false;

      const eventTime = moment(event.datetime.toDate ? event.datetime.toDate() : event.datetime);
      const now = moment();
      const endOfDay = now.clone().endOf('day');

      return eventTime.isBetween(now, endOfDay);
    });

    if (upcomingEvents.length > 0) {
      try {
        const lines = upcomingEvents.slice(0, 3).map((event) => {
          const eventTime = moment(event.datetime.toDate ? event.datetime.toDate() : event.datetime);
          return `• ${event.title} (${eventTime.format('HH:mm')} - ${event.roomName})`;
        }).join('\n');
        const more = upcomingEvents.length > 3 ? `\n...và ${upcomingEvents.length - 3} sự kiện khác` : '';
        window.alert(`Lịch trình hôm nay\n\n${lines}${more}`);
      } catch { }
    }
  }

  // Clean up
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
