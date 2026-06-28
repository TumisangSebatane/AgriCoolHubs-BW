import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Brain, 
  X, 
  Minus, 
  Bot, 
  User,
  Zap,
  Gauge,
  HelpCircle
} from "lucide-react";
import { ChatMessage } from "../types";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hello! I am your **AgriCool Hubs Advisor**. I can assist you with solar cold storage planning, temperature configurations for Botswana's crops (like peppers, tomatoes, and leafy greens), ROI math, or sustainable cooling solutions. How can I support your harvest today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<"gemini-3.5-flash" | "gemini-3.1-flash-lite" | "gemini-3.1-pro-preview">("gemini-3.5-flash");
  const [thinking, setThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    if (!customText) {
      setInput("");
    }

    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(1), // omit the welcome message from standard system hist
          model: thinking ? "gemini-3.1-pro-preview" : model,
          thinking: thinking,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: "m_" + Date.now(),
            role: "model",
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: "err_" + Date.now(),
            role: "model",
            content: `⚠️ **Error**: ${data.error || "Could not reach the advisor."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err_" + Date.now(),
          role: "model",
          content: "⚠️ **Network Error**: Unable to connect to the advisor server.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: "Optimal Bell Pepper temp?", query: "What is the optimal storage temperature and relative humidity for bell peppers and tomatoes?" },
    { label: "How does Cooling-as-a-Service work?", query: "Can you explain how the 'Cooling-as-a-Service' subscription model works for smallholder farmer groups?" },
    { label: "Calculate solar cold room size", query: "Can you calculate the estimated solar PV and battery pack required for a 10-metric-ton capacity cold room?" }
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="chatbot-fab"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-primary text-on-primary rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group border border-primary-fixed"
      >
        <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold text-sm whitespace-nowrap">
          Ask AgriCool AI
        </span>
        {thinking && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-secondary"></span>
          </span>
        )}
      </button>

      {/* Chat Window Overlay */}
      {isOpen && (
        <div
          id="chatbot-window"
          className="fixed bottom-24 right-6 z-50 w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col h-[600px] transition-all duration-300"
        >
          {/* Header */}
          <div className="bg-primary text-on-primary p-4 flex items-center justify-between border-b border-primary-container">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center border border-on-primary-container/20">
                <Bot className="w-6 h-6 text-on-primary-container" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-primary flex items-center gap-1.5">
                  AgriCool AI Advisor
                  {thinking && (
                    <span className="px-1.5 py-0.5 bg-secondary text-on-secondary-container rounded text-[10px] uppercase font-bold animate-pulse">
                      Thinking HIGH
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-on-primary-container/80">Solar cold storage specialist</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-primary-container/50 rounded transition-colors text-on-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Configuration / Model Selector Bar */}
          <div className="bg-surface-container p-2 border-b border-outline-variant/30 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-on-surface-variant px-1">
              <span className="font-medium">Model Preset:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setModel("gemini-3.5-flash");
                    setThinking(false);
                  }}
                  disabled={thinking}
                  className={`px-2 py-1 rounded transition-colors ${
                    !thinking && model === "gemini-3.5-flash"
                      ? "bg-primary text-on-primary font-bold"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  } disabled:opacity-50`}
                >
                  3.5 Flash
                </button>
                <button
                  onClick={() => {
                    setModel("gemini-3.1-flash-lite");
                    setThinking(false);
                  }}
                  disabled={thinking}
                  className={`px-2 py-1 rounded transition-colors ${
                    !thinking && model === "gemini-3.1-flash-lite"
                      ? "bg-primary text-on-primary font-bold"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  } disabled:opacity-50`}
                >
                  3.1 Lite
                </button>
                <button
                  onClick={() => {
                    setModel("gemini-3.1-pro-preview");
                    setThinking(false);
                  }}
                  disabled={thinking}
                  className={`px-2 py-1 rounded transition-colors ${
                    !thinking && model === "gemini-3.1-pro-preview"
                      ? "bg-primary text-on-primary font-bold"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  } disabled:opacity-50`}
                >
                  3.1 Pro
                </button>
              </div>
            </div>

            {/* High Thinking Selector (Mandatory Prompt Feature) */}
            <div className="flex items-center justify-between px-1 py-1.5 bg-surface-container-low rounded border border-outline-variant/40">
              <div className="flex items-center gap-1.5">
                <Brain className={`w-4 h-4 ${thinking ? "text-secondary animate-pulse" : "text-outline"}`} />
                <div>
                  <p className="text-[11px] font-bold text-on-surface">Enable High Thinking Mode</p>
                  <p className="text-[9px] text-on-surface-variant">Deep reasoning with 3.1 Pro</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={thinking}
                  onChange={(e) => setThinking(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-outline rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    msg.role === "user"
                      ? "bg-primary text-on-primary"
                      : "bg-secondary-container text-on-secondary-container"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div>
                  <div
                    className={`p-3 rounded-2xl text-xs space-y-1 shadow-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary-container text-on-primary-container rounded-tr-none"
                        : "bg-surface-container text-on-surface rounded-tl-none border border-outline-variant/30"
                    }`}
                  >
                    {/* Simplified Markdown-like formatting helper */}
                    <div className="whitespace-pre-line">
                      {msg.content.split("\n").map((line, lIdx) => {
                        // Support bullet points
                        if (line.trim().startsWith("- ")) {
                          return (
                            <ul key={lIdx} className="list-disc pl-4 my-1">
                              <li>{renderFormattedText(line.trim().substring(2))}</li>
                            </ul>
                          );
                        }
                        return <p key={lIdx} className="my-0.5">{renderFormattedText(line)}</p>;
                      })}
                    </div>
                  </div>
                  <span className="text-[9px] text-outline px-1 block mt-1 text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto">
                <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 text-xs">
                  <Brain className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <div className="p-3 bg-surface-container text-on-surface rounded-2xl rounded-tl-none border border-outline-variant/30 text-xs flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </span>
                    <span className="italic text-on-surface-variant text-[11px]">
                      {thinking ? "Deep reasoning..." : "Advisor compiling solution..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Helper */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 py-2 border-t border-outline-variant/20 bg-surface-container-low flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-primary" /> Ask About
              </span>
              <div className="flex flex-col gap-1">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(undefined, p.query)}
                    className="text-left text-xs bg-surface hover:bg-primary-fixed hover:text-on-primary-fixed p-1.5 rounded border border-outline-variant/40 text-on-surface-variant transition-all font-medium truncate"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Input Footer */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-surface-container border-t border-outline-variant flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for temperature guides, solar calculations..."
              className="flex-1 bg-surface-container-lowest rounded-xl px-3 py-2 text-xs border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-primary text-on-primary rounded-xl hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-40 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// Simple Helper to process double asterisks into strong tags safely
function renderFormattedText(text: string) {
  if (!text) return "";
  const parts = text.split("(\\*\\*.*?\\*\\*)");
  const regex = /\*\*(.*?)\*\*/g;
  
  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) return text;
  
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  
  matches.forEach((match, idx) => {
    const startIndex = match.index!;
    const matchText = match[1];
    
    if (startIndex > lastIndex) {
      elements.push(text.substring(lastIndex, startIndex));
    }
    elements.push(<strong key={idx} className="font-bold text-primary">{matchText}</strong>);
    lastIndex = startIndex + match[0].length;
  });
  
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }
  
  return <>{elements}</>;
}
