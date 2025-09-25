import OpenAI from 'openai';

const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.REACT_APP_OPENROUTER_API_KEY,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
        'HTTP-Referer': 'https://smurfchat.com',
        'X-Title': 'SmurfChat',
    },
});

export const generateGeminiResponse = async (userMessage, context = '') => {
    try {
        const messages = [
            {
                role: 'user',
                content: context
                    ? `${context}\n\n${userMessage}`
                    : `You are a helpful AI assistant in a chat application. Respond naturally and helpfully.\n\n${userMessage}`
            }
        ];

        const completion = await client.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            messages,
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('OpenRouter API error:', error);
        throw new Error('Không thể tạo phản hồi từ AI. Vui lòng thử lại sau.');
    }
};

export const generateChatbotResponse = async (message, conversationHistory = []) => {
    try {
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

        const messages = [
            { role: 'system', content: systemMessage },
            ...conversationHistory.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: 'user', content: message }
        ];

        const completion = await client.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            messages,
        });

        return completion.choices[0].message.content.trim();
    } catch (error) {
        console.error('Chatbot response error:', error);
        return 'Xin lỗi, tôi không thể phản hồi ngay bây giờ. Vui lòng thử lại sau.';
    }
};