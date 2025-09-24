import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { format, isAfter, isBefore, differenceInMinutes } from 'date-fns';

/**
 * Service quản lý nhắc nhở sự kiện
 * Tự động theo dõi và thông báo khi sự kiện sắp diễn ra
 */
class EventReminderService {
    constructor() {
        this.activeReminders = new Map();
        this.unsubscribeEvents = null;
        this.alertProvider = null;
        this.userId = null;
    }

    /**
     * Khởi tạo service với user ID và alert provider
     */
    initialize(userId, alertProvider) {
        this.userId = userId;
        this.alertProvider = alertProvider;
        this.startEventMonitoring();
    }

    /**
     * Bắt đầu theo dõi sự kiện của user
     */
    startEventMonitoring() {
        if (!this.userId || this.unsubscribeEvents) return;

        try {
            const eventsQuery = query(
                collection(db, 'events'),
                where('participants', 'array-contains', this.userId)
            );

            this.unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
                this.handleEventsUpdate(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })));
            });
        } catch (error) {
            console.error('Lỗi khi khởi tạo event monitoring:', error);
        }
    }

    /**
     * Xử lý cập nhật danh sách sự kiện
     */
    handleEventsUpdate(events) {
        const now = new Date();
        const upcomingEvents = events.filter(event => {
            if (event.status !== 'active') return false;

            const eventTime = event.datetime?.toDate?.() || new Date(event.datetime);
            const reminderTime = this.calculateReminderTime(eventTime, event.reminderMinutes || 15);

            return isAfter(reminderTime, now) && isBefore(eventTime, new Date(now.getTime() + 24 * 60 * 60 * 1000));
        });

        this.scheduleReminders(upcomingEvents);
    }

    /**
     * Tính thời gian cần nhắc nhở
     */
    calculateReminderTime(eventTime, reminderMinutes) {
        return new Date(eventTime.getTime() - (reminderMinutes * 60 * 1000));
    }

    /**
     * Lên lịch nhắc nhở cho các sự kiện
     */
    scheduleReminders(events) {
        // Xóa các reminder cũ
        this.clearAllReminders();

        events.forEach(event => {
            const eventTime = event.datetime?.toDate?.() || new Date(event.datetime);
            const reminderTime = this.calculateReminderTime(eventTime, event.reminderMinutes || 15);

            if (isAfter(reminderTime, new Date())) {
                const timeoutId = setTimeout(() => {
                    this.triggerReminder(event);
                }, reminderTime.getTime() - Date.now());

                this.activeReminders.set(event.id, {
                    timeoutId,
                    event,
                    triggered: false
                });
            }
        });
    }

    /**
     * Kích hoạt nhắc nhở cho sự kiện
     */
    triggerReminder(event) {
        const eventTime = event.datetime?.toDate?.() || new Date(event.datetime);
        const timeUntilEvent = differenceInMinutes(eventTime, new Date());

        const reminderMessage = this.formatReminderMessage(event, timeUntilEvent);

        // Hiển thị thông báo
        if (this.alertProvider?.info) {
            this.alertProvider.info(reminderMessage, 'Nhắc nhở sự kiện');
        }

        // Đánh dấu đã trigger
        const reminder = this.activeReminders.get(event.id);
        if (reminder) {
            reminder.triggered = true;
        }
    }

    /**
     * Format thông báo nhắc nhở
     */
    formatReminderMessage(event, minutesUntilEvent) {
        const eventTime = event.datetime?.toDate?.() || new Date(event.datetime);
        const timeStr = format(eventTime, 'HH:mm dd/MM');

        let message = `${event.title}\n⏰ ${timeStr}\n`;

        if (minutesUntilEvent <= 60) {
            message += `⏳ Còn ${minutesUntilEvent} phút nữa bắt đầu`;
        } else {
            const hours = Math.floor(minutesUntilEvent / 60);
            const mins = minutesUntilEvent % 60;
            message += `⏳ Còn ${hours} giờ ${mins} phút nữa bắt đầu`;
        }

        if (event.description) {
            message += `\n📝 ${event.description}`;
        }

        return message;
    }

    /**
     * Xóa tất cả reminder đang hoạt động
     */
    clearAllReminders() {
        this.activeReminders.forEach((reminder) => {
            if (reminder.timeoutId) {
                clearTimeout(reminder.timeoutId);
            }
        });
        this.activeReminders.clear();
    }

    /**
     * Dọn dẹp service
     */
    destroy() {
        if (this.unsubscribeEvents) {
            this.unsubscribeEvents();
            this.unsubscribeEvents = null;
        }
        this.clearAllReminders();
        this.userId = null;
        this.alertProvider = null;
    }
}

// Singleton instance
const eventReminderService = new EventReminderService();

export default eventReminderService;