import OpenAI from 'openai';

// Khởi tạo client OpenAI với cấu hình cho OpenRouter
const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.REACT_APP_OPENROUTER_API_KEY,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
        'HTTP-Referer': 'https://smurfchat.com',
        'X-Title': 'SmurfChat',
    },
});

// Hàm tạo phản hồi từ chatbot
export const generateChatbotResponse = async (message, conversationHistory = []) => {
    try {
        // Tạo thông điệp hệ thống với ngày giờ hiện tại
        const systemMessage = `You are SmurfChat AI, a helpful assistant in this chat application. Be friendly, helpful, and engaging. Keep responses concise but informative.

Current date and time: ${new Date().toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })}`;

        // Chuẩn bị mảng tin nhắn cho API, bao gồm lịch sử cuộc trò chuyện gần nhất
        const messages = [
            { role: 'system', content: systemMessage },
            ...conversationHistory.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: 'user', content: message }
        ];

        // Gửi yêu cầu tạo phản hồi từ mô hình GPT-4o-mini
        const completion = await client.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            messages,
        });

        // Trả về nội dung phản hồi, loại bỏ khoảng trắng thừa
        return completion.choices[0].message.content.trim();
    } catch (error) {
        // Ghi log lỗi và trả về thông báo lỗi bằng tiếng Việt
        console.error('Chatbot response error:', error);
        return 'Xin lỗi, tôi không thể phản hồi ngay bây giờ. Vui lòng thử lại sau.';
    }
};