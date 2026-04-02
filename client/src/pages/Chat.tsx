import { useState, useRef, useEffect } from "react";
import { CyberCard } from "../components/CyberCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Bot, Send, User, Sparkles } from "lucide-react";
import logoImg from "@assets/1771108919092_1771109065229.jpg";

interface Message {
    id: number;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

// WebDollar2 Knowledge Base — the AI uses this to answer questions
const KB: { keywords: string[]; answer: string }[] = [
    {
        keywords: ["what is", "webdollar", "webd2", "about", "explain"],
        answer: "WebDollar 2 (WEBD2) is a next-generation cryptocurrency built for security, speed, and ease of mass adoption. It features a Proof-of-Stake consensus mechanism, 5-second block times, and a total supply of 68 billion WEBD. The project is a complete rebuild of the original WebDollar with real cryptography and modern blockchain architecture."
    },
    {
        keywords: ["total supply", "how many", "max supply", "68 billion"],
        answer: "The total supply of WebDollar 2 is 68,000,000,000 (68 billion) WEBD. This is distributed as follows:\n• 64.1% (43.6B) — Public mining/staking rewards\n• 20.9% (14.2B) — V1 Active Migration Reserve\n• 10% (6.8B) — Development fund\n• 5% (3.4B) — Foundation fund\n\nThe mineable supply is released over ~100 years with halving every 3 years."
    },
    {
        keywords: ["price", "value", "worth", "cost", "usd"],
        answer: "The current price of WEBD2 is $0.000963 USD per token. You can purchase tokens on the Buy page with volume discounts:\n• 10,000 WEBD — no discount\n• 50,000 WEBD — 1% off\n• 250,000 WEBD — 1.5% off\n• 1,000,000 WEBD — 2% off\n• 5,000,000 WEBD — 2.5% off"
    },
    {
        keywords: ["stake", "staking", "pos", "proof of stake", "validator", "earn", "passive"],
        answer: "WebDollar 2 uses Proof-of-Stake (PoS) consensus. To become a validator:\n• Minimum stake: 1,000 WEBD\n• Estimated APY: ~10%\n• Block time: 5 seconds\n• Rewards distributed every block\n• Unbonding period: 7 days\n\nThe more you stake, the higher your chance of validating the next block and earning rewards. Go to the Staking page to get started!"
    },
    {
        keywords: ["block time", "block", "how fast", "speed", "seconds"],
        answer: "WebDollar 2 has a 5-second block time, making it one of the fastest blockchain networks. This means transactions confirm in approximately 5 seconds. Over 100 years, this produces roughly 631 million blocks with halving every 3 years (~18.9 million blocks per halving cycle)."
    },
    {
        keywords: ["halving", "emission", "reward", "mining reward", "block reward"],
        answer: "WEBD2 has a halving schedule every 3 years:\n• Initial block reward: ~1,150 WEBD per block\n• After 3 years: ~575 WEBD\n• After 6 years: ~287.5 WEBD\n• And so on...\n\nThis creates a smooth 100-year emission curve. After ~33 halvings, the mining reward becomes negligible."
    },
    {
        keywords: ["swap", "convert", "legacy", "migration", "old webd", "burn"],
        answer: "You can convert old WEBD tokens to WEBD2 through the Swap page:\n\n1. Send old WEBD to the burn address\n2. Submit a conversion request with your old address and amount\n3. Admin verifies the deposit and approves\n4. WEBD2 is automatically sent to your wallet\n\nSwap limits per address:\n• Initial: 5,000,000 WEBD\n• After 6 months: +2,000,000\n• Every 6 months after: +1,000,000"
    },
    {
        keywords: ["wallet", "address", "create wallet", "new wallet", "seed", "phrase", "recovery"],
        answer: "Your WEBD2 wallet is created automatically when you first visit the site. Key features:\n• Multi-address support (create multiple addresses)\n• 12-word recovery phrase for backup\n• QR code for receiving payments\n• Import/export functionality\n• Faucet for free test tokens\n\nAlways save your 12-word recovery phrase in a safe place — it's the only way to recover your wallet!"
    },
    {
        keywords: ["card", "debit", "spend", "visa", "mastercard", "atm"],
        answer: "The WDollar Card lets you spend WEBD as fiat anywhere Visa/Mastercard is accepted:\n• Instant WEBD-to-fiat conversion at point of sale\n• Works at 50M+ merchants worldwide\n• ATM withdrawals\n• No monthly or annual fees\n• Fee tiers from 0.8% to 2.5% based on volume\n\nThe card is currently in beta. You can join the waitlist on the Card page!"
    },
    {
        keywords: ["buy", "purchase", "how to buy", "get webd", "acquire"],
        answer: "You can buy WEBD2 tokens on the Buy page. Available packages:\n• 10,000 WEBD — $9.63 (no discount)\n• 50,000 WEBD — $47.67 (1% off)\n• 250,000 WEBD — $237.24 (1.5% off)\n• 1,000,000 WEBD — $943.74 (2% off)\n• 5,000,000 WEBD — $4,694.63 (2.5% off)\n\nCustom amounts available at base price ($0.000963/WEBD). Payments processed via Stripe."
    },
    {
        keywords: ["security", "safe", "secure", "cryptography", "encryption"],
        answer: "WebDollar 2 is built with real cryptography from the ground up:\n• Elliptic curve cryptography for wallet keys\n• SHA-256 hashing for blocks\n• Proof-of-Stake consensus (energy efficient)\n• Client-side key management (your keys never leave your device)\n• 12-word recovery phrases for wallet backup\n• Open source code for transparency"
    },
    {
        keywords: ["faucet", "free", "test", "testnet"],
        answer: "You can get free test WEBD tokens using the faucet! Each faucet request gives you 10,000 WEBD. You can find the faucet button on the Wallet page next to each address, or on the Staking page if your balance is below the minimum stake requirement."
    },
    {
        keywords: ["explorer", "blocks", "transactions", "view", "search"],
        answer: "The Block Explorer shows real-time WebDollar2 blockchain data:\n• Latest blocks with validator addresses\n• Transaction history with sender/receiver\n• Chain stats (blocks, transactions, peers, consensus)\n• Search by address or block hash\n\nVisit the Explorer page to browse the blockchain!"
    },
    {
        keywords: ["peer", "p2p", "network", "connect", "node"],
        answer: "WebDollar 2 uses a peer-to-peer (P2P) network via WebRTC for decentralized communication. Your browser connects to other nodes through a signaling server. The more peers connected, the stronger and more secure the network becomes."
    },
    {
        keywords: ["decimals", "precision", "smallest unit", "divisible"],
        answer: "WEBD2 uses 6 decimal places of precision. The smallest unit is 0.000001 WEBD. This provides sufficient granularity for micro-transactions while keeping numbers manageable."
    },
    {
        keywords: ["hello", "hi", "hey", "help", "support"],
        answer: "Hello! 👋 I'm the WebDollar 2 AI assistant. I can help you with:\n• Tokenomics & supply info\n• Staking & validation\n• Wallet management\n• Legacy token conversion\n• Buying WEBD tokens\n• WDollar Card\n• Block explorer\n• Security & cryptography\n\nJust ask me anything about WebDollar 2!"
    },
];

function findAnswer(query: string): string {
    const q = query.toLowerCase();

    // Find best matching topic
    let bestMatch = { score: 0, answer: "" };
    for (const entry of KB) {
        const score = entry.keywords.filter(kw => q.includes(kw.toLowerCase())).length;
        if (score > bestMatch.score) {
            bestMatch = { score, answer: entry.answer };
        }
    }

    if (bestMatch.score > 0) return bestMatch.answer;

    return "I don't have specific information about that yet, but I'm always learning! Here's what I can help you with:\n\n• **Tokenomics** — supply, price, halving\n• **Staking** — how to stake, rewards, APY\n• **Wallet** — creating, importing, recovery\n• **Swap** — converting old WEBD to WEBD2\n• **Buy** — purchasing tokens\n• **Card** — WDollar debit card\n• **Explorer** — browsing the blockchain\n\nTry asking about any of these topics!";
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 0,
            role: "assistant",
            content: "👋 Welcome to WebDollar 2 Support! I'm your AI assistant, trained on everything WEBD2 — tokenomics, staking, wallets, swaps, and more. How can I help you today?",
            timestamp: Date.now(),
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        const messageContent = input.trim();
        const userMsgId = Date.now() + Math.random();
        const userMsg: Message = {
            id: userMsgId,
            role: "user",
            content: messageContent,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Simulate AI thinking delay
        setTimeout(() => {
            setMessages(prev => {
                const answer = findAnswer(messageContent);
                const aiMsg: Message = {
                    id: Date.now() + Math.random(),
                    role: "assistant",
                    content: answer,
                    timestamp: Date.now(),
                };
                return [...prev, aiMsg];
            });
            setIsTyping(false);
        }, 600 + Math.random() * 800);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col" style={{ height: "calc(100vh - 10rem)" }}>
            <div className="flex items-center gap-3 border-b border-primary/20 pb-4 mb-4">
                <div className="relative">
                    <img src={logoImg} alt="WEBD2 AI" className="w-12 h-12 rounded-full object-cover" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-background" />
                </div>
                <div>
                    <h1 className="text-2xl font-heading text-accent flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> WEBD2 AI SUPPORT
                    </h1>
                    <p className="text-xs font-mono text-green-400/80">Online • Trained on WebDollar 2</p>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"
                            }`}>
                            {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === "assistant"
                            ? "bg-card border border-primary/10 text-foreground"
                            : "bg-accent/10 text-foreground"
                            }`}>
                            <div className="text-sm font-mono whitespace-pre-line leading-relaxed">{msg.content}</div>
                            <div className="text-[10px] text-muted-foreground mt-2 font-mono" style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-accent/20 text-accent">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-card border border-primary/10 rounded-lg px-4 py-3">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {["What is WEBD2?", "How to stake?", "Token price", "How to buy?", "WDollar Card", "Swap old WEBD"].map(q => (
                    <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="text-[10px] font-mono px-2 py-1 rounded-md border border-primary/20 text-muted-foreground hover:text-accent hover:border-accent/30 transition-colors"
                    >
                        {q}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask anything about WebDollar 2..."
                    className="bg-input border-primary/30 font-mono flex-1"
                    disabled={isTyping}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="btn-neon shrink-0">
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
