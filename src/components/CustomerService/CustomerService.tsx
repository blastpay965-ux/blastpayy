'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, Bot, Loader2 } from 'lucide-react';
import styles from './CustomerService.module.css';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export default function CustomerService() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hi there! Welcome to BlastPay Live Support. How can we assist you today? Select a topic below, or type your question!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when new message is added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const addBotReply = (userQuery: string) => {
    setIsTyping(true);

    setTimeout(() => {
      let replyText = "Thank you for contacting BlastPay support. Our agents have been notified of your query. For instant answers, please mention 'deposit', 'withdraw', or 'verify' in your message!";

      const query = userQuery.toLowerCase();

      if (query.includes('deposit') || query.includes('fund') || query.includes('pay') || query.includes('money')) {
        replyText = "💰 **How to Deposit NGN**:\n\n1. Click the green **Deposit** button in your top navigation wallet bar.\n2. Choose a quick amount (₦5,000, ₦10,000) or enter a custom amount.\n3. Click **Confirm Deposit** to launch the secure Flutterwave checkout.\n4. Complete the test transaction, and your casino balance credits instantly!";
      } else if (query.includes('withdraw') || query.includes('payout') || query.includes('cashout') || query.includes('bank')) {
        replyText = "🏦 **How to Payout / Withdraw**:\n\n1. Go to the wallet side panel and select the **Withdraw** tab.\n2. Click the dashed **Go to NGN Payout Portal** button to navigate to `/withdraw`.\n3. Choose your bank (GTBank, Zenith, OPay, Kuda, etc.) and enter your 10-digit account number.\n4. The system will verify your account name instantly. Enter the amount and confirm to flash transfer to your bank!";
      } else if (query.includes('otp') || query.includes('code') || query.includes('verify') || query.includes('register')) {
        replyText = "🔒 **OTP Verification Helper**:\n\nVerification OTPs are sent immediately during signup. If you are in development/test mode:\n\n👉 Check your **Next.js Backend Node Terminal**! We log the secure 6-digit verification code directly to the server terminal: `[BLASTPAY SECURITY] Real OTP Code`. Simply copy the code and verify!";
      } else if (query.includes('aviator') || query.includes('crash') || query.includes('mines') || query.includes('play')) {
        replyText = "✈️ **How to Play Games**:\n\nBlastPay hosts Provably Fair games. Open Aviator or Mines from the lobby. Enter your NGN bet, click **Bet**, and watch your multipliers compound! Be sure to cash out before the rocket crashes or you hit a mine!";
      }

      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
    setInputText('');

    addBotReply(userText);
  };

  const handleQuickTopic = (topic: string, queryText: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `user-topic-${Date.now()}`,
        sender: 'user',
        text: topic,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);

    addBotReply(queryText);
  };

  return (
    <>
      {/* Floating Support Badge */}
      <div className={styles.floatingBadge} onClick={() => setIsOpen(!isOpen)}>
        <MessageSquare size={24} />
        <span className={styles.onlineIndicator} />
      </div>

      {/* Floating Support Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.supportInfo}>
              <div className={styles.avatar}>
                <Bot size={18} />
              </div>
              <div>
                <div className={styles.headerTitle}>BlastPay Support</div>
                <div className={styles.headerSubtitle}>Online Assistants 24/7</div>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className={styles.messageArea}>
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`${styles.message} ${msg.sender === 'user' ? styles.userMessage : styles.botMessage}`}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {msg.text}
                <div style={{ fontSize: '0.65rem', textAlign: 'right', marginTop: '0.25rem', opacity: 0.6 }}>
                  {msg.timestamp}
                </div>
              </div>
            ))}

            {/* Quick Topic Assistance Prompts */}
            {messages[messages.length - 1]?.sender === 'bot' && !isTyping && (
              <div className={styles.quickReplies}>
                <button 
                  className={styles.quickReplyBtn}
                  onClick={() => handleQuickTopic('💰 How do I Deposit?', 'deposit')}
                >
                  💰 How do I Deposit NGN?
                </button>
                <button 
                  className={styles.quickReplyBtn}
                  onClick={() => handleQuickTopic('🏦 How do I Payout?', 'withdraw')}
                >
                  🏦 How do I Withdraw/Payout?
                </button>
                <button 
                  className={styles.quickReplyBtn}
                  onClick={() => handleQuickTopic('🔒 Where is my signup OTP?', 'otp')}
                >
                  🔒 Where is my signup OTP code?
                </button>
                <button 
                  className={styles.quickReplyBtn}
                  onClick={() => handleQuickTopic('✈️ How to play Aviator?', 'aviator')}
                >
                  ✈️ How do I play Aviator?
                </button>
              </div>
            )}

            {isTyping && (
              <div className={styles.typingIndicator}>
                <Loader2 size={12} className="animate-spin" /> BlastPay Assistant is typing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* User Text Input Bar */}
          <form onSubmit={handleSendMessage} className={styles.inputArea}>
            <input 
              type="text" 
              placeholder="Ask a question..."
              className={styles.chatInput}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" className={styles.sendBtn} disabled={isTyping}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
