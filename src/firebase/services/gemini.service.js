import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GOOGLE_GEMINI_API_KEY);

export const generateGeminiResponse = async (userMessage, context = '') => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = context
            ? `${context}\n\nUser: ${userMessage}\nAssistant:`
            : `You are a helpful AI assistant in a chat application. Respond naturally and helpfully.\n\nUser: ${userMessage}\nAssistant:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return text.trim();
    } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Không thể tạo phản hồi từ AI. Vui lòng thử lại sau.');
    }
};

export const generateChatbotResponse = async (message, conversationHistory = []) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        let context = 'You are SmurfChat AI, a helpful assistant in this chat application. Be friendly, helpful, and engaging. Keep responses concise but informative.';

        if (conversationHistory.length > 0) {
            context += '\n\nConversation history:\n';
            conversationHistory.slice(-10).forEach(msg => {
                context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
        }

        context += `\nUser: ${message}\nAssistant:`;

        const result = await model.generateContent(context);
        const response = await result.response;
        const text = response.text();

        return text.trim();
    } catch (error) {
        console.error('Chatbot response error:', error);
        return 'Xin lỗi, tôi không thể phản hồi ngay bây giờ. Vui lòng thử lại sau.';
    }
};