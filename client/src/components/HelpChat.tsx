import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "How does staking work?",
  "What is my WEBD$ address?",
  "How do I buy WEBD tokens?",
  "What is the total supply?",
];

export function HelpChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const response = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to get response" }));
        setMessages([...updatedMessages, { role: "assistant", content: err.error || "Something went wrong. Please try again." }]);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, I couldn't connect. Please try again." };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 flex flex-col transition-all duration-300",
          isOpen ? "w-[calc(100vw-32px)] sm:w-[380px] h-[520px] max-h-[80vh]" : "w-auto h-auto"
        )}
        data-testid="help-chat-container"
      >
        {isOpen && (
          <div className="flex flex-col h-full rounded-md border border-accent/30 bg-card shadow-lg overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-accent/10 border-b border-accent/20">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-accent" />
                <span className="font-heading text-sm font-bold text-accent tracking-wide">WEBD HELP</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3" data-testid="chat-messages">
              {messages.length === 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Ask me anything about WebDollar 2
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-xs px-3 py-1.5 rounded-md border border-accent/20 text-muted-foreground hover-elevate transition-colors"
                        data-testid={`button-suggestion-${q.slice(0, 10).replace(/\s/g, "-").toLowerCase()}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-accent/20 text-foreground"
                        : "bg-muted text-foreground"
                    )}
                    data-testid={`chat-message-${msg.role}-${i}`}
                  >
                    {msg.content || (isStreaming && i === messages.length - 1 ? (
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    ) : null)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-accent/20">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                disabled={isStreaming}
                className="flex-1 bg-background border border-accent/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent/50 placeholder:text-muted-foreground"
                data-testid="input-help-message"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={isStreaming || !input.trim()}
                data-testid="button-send-help"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </div>

      {!isOpen && (
        <Button
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-accent text-accent-foreground shadow-lg"
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}
    </>
  );
}
