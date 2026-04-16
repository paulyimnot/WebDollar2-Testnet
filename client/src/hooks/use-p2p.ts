import { useEffect, useRef, useState } from "react";

export function useP2P() {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectAttempt, setConnectAttempt] = useState(0);
  const [isBackbone, setIsBackbone] = useState(() => {
    return localStorage.getItem("wd2_is_backbone") === "true";
  });
  const socketRef = useRef<WebSocket | null>(null);

  const toggleBackbone = () => {
    const newState = !isBackbone;
    setIsBackbone(newState);
    localStorage.setItem("wd2_is_backbone", newState.toString());
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      if (newState) {
        socketRef.current.send(JSON.stringify({ type: 'declare_backbone' }));
      }
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/ws`);

    socket.onopen = () => {
      console.log("📡 Connected to WebDollar 2 Signaling Server");
      setIsConnected(true);
      // Re-declare backbone status if it was active before reconnection
      if (isBackbone) {
        socket.send(JSON.stringify({ type: 'declare_backbone' }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'welcome':
            setPeerId(data.id);
            setNeighbors(data.peers);
            break;
          case 'peer_joined':
            setNeighbors(prev => [...new Set([...prev, data.peerId])]);
            break;
          case 'peer_left':
            setNeighbors(prev => prev.filter(id => id !== data.peerId));
            break;
          case 'vote_request':
            // 🔥 HYBRID QUORUM CONSENSUS: The browser natively signs off on the block proposal
            if (socket.readyState === WebSocket.OPEN) {
               socket.send(JSON.stringify({ 
                  type: 'vote_cast', 
                  hash: data.hash 
               }));
            }
            break;
        }
      } catch (e) {
        console.error("Malformed signaling message:", e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setPeerId(null);
      setNeighbors([]);
      setTimeout(() => setConnectAttempt(prev => prev + 1), 5000);
    };

    socketRef.current = socket;

    return () => socket.close();
  }, [connectAttempt]);

  return { peerId, neighbors, isConnected, isBackbone, toggleBackbone };
}
