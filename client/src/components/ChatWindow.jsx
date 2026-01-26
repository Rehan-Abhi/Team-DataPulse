import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { auth } from '../firebase';

function ChatWindow({ conversationId, targetName, onClose }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/chat/${conversationId}`);
            setMessages(res.data.messages || []);
            setLoading(false);
        } catch (error) {
            console.error("Fetch chat error:", error);
        }
    };

    useEffect(() => {
        fetchMessages();
        // Poll every 3 seconds for new messages
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [conversationId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await api.post(`/chat/${conversationId}/message`, { text: newMessage });
            setNewMessage('');
            fetchMessages(); // Immediate refresh
        } catch (error) {
            console.error("Send error:", error);
            alert("Failed to send message");
        }
    };

    const myUid = auth.currentUser?.uid;

    return (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-t-xl rounded-bl-xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-slide-up">
            {/* Header */}
            <div className="bg-blue-600 text-white p-3 rounded-t-xl flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <h3 className="font-bold truncate max-w-[150px]">{targetName || "Chat"}</h3>
                </div>
                <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors">&times;</button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                    <div className="text-center text-gray-400 text-sm mt-10">Loading history...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-10">Say hi to start the exchange! 👋</div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.senderId === myUid;
                        return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                    isMe 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                }`}>
                                    <p>{msg.text}</p>
                                    <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 border rounded-full px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                />
                <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    ➤
                </button>
            </form>
        </div>
    );
}

export default ChatWindow;
