// Lightweight notification using native alerts for now
import { subMinutes, isAfter, isBefore, differenceInMinutes, format, endOfDay, isWithinInterval, compareAsc } from 'date-fns';

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

    const eventTime = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
    const reminderTime = subMinutes(eventTime, event.reminderMinutes);
    const now = new Date();

    // Only add reminder if it's in the future
    if (isAfter(reminderTime, now)) {
      this.reminders.set(event.id, {
        ...event,
        reminderTime,
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
    const now = new Date();

    this.reminders.forEach((reminder, eventId) => {
      if (!reminder.notified && (isBefore(reminder.reminderTime, now) || reminder.reminderTime.getTime() === now.getTime())) {
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
    
    const eventTime = event.datetime.toDate ? event.datetime.toDate() : new Date(event.datetime);
    const now = new Date();
    const timeUntilEvent = differenceInMinutes(eventTime, now);

    try {
      // Replace with a custom toast system later
      const details = `${event.title}\nPhòng: ${event.roomName}\nThời gian: ${format(eventTime, 'dd/MM/yyyy HH:mm')}\nCòn ${timeUntilEvent} phút nữa` + (event.description ? `\n${event.description}` : '');
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

  // Show daily agenda
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
