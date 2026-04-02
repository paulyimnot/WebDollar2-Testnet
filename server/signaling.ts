import { WebSocketServer, WebSocket } from "ws";

export function setupSignaling(server: any) {
  const peers = new Map<string, { ws: WebSocket; id: string; links: Set<string> }>();
  let nextId = 1;

  const wss = new WebSocketServer({ server });

  console.log("\n🟢 DIELBS Signaling Server successfully integrated into main process");
  console.log("   Waiting for peer connections...\n");

  wss.on('connection', (ws) => {
      const peerId = `peer-${nextId++}`;
      peers.set(peerId, { ws, id: peerId, links: new Set() });
      console.log(`✦ Peer connected: ${peerId} (${peers.size} total)`);

      // Assign max 8 random peers to create a stable P2P mesh graph
      const MAX_PEERS = 8;
      const existingPeerIds = Array.from(peers.keys()).filter((id) => id !== peerId);
      const shuffled = existingPeerIds.sort(() => 0.5 - Math.random());
      const selectedPeers = shuffled.slice(0, MAX_PEERS);

      // Bidirectional mesh links
      selectedPeers.forEach((targetId) => {
          peers.get(peerId)?.links.add(targetId);
          peers.get(targetId)?.links.add(peerId);

          // Alert the existing peer that a new node linked to them
          const existingPeer = peers.get(targetId);
          if (existingPeer && existingPeer.ws.readyState === WebSocket.OPEN) {
              existingPeer.ws.send(JSON.stringify({
                  type: 'peer_joined',
                  peerId: peerId
              }));
          }
      });

      ws.send(JSON.stringify({
          type: 'welcome',
          id: peerId,
          peers: selectedPeers,
      }));

      ws.on('message', (raw) => {
          try {
              const data = JSON.parse(raw.toString());

              // Validate message structure
              if (!data || typeof data.type !== 'string') {
                  console.warn(`  ⚠ Malformed message from ${peerId}`);
                  return;
              }

              switch (data.type) {
                  case 'broadcast':
                      // Route Gossip Protocol data out to linked mesh peers only
                      const payload = data.payload || data.data; // Support both payload formats
                      if (!payload) {
                          console.warn(`  ⚠ Invalid broadcast from ${peerId} — missing payload`);
                          return;
                      }

                      const myLinks = Array.from(peers.get(peerId)?.links || []);
                      if (!myLinks.length) return;

                      for (const targetId of myLinks) {
                          const targetPeer = peers.get(targetId);
                          if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
                              try {
                                  targetPeer.ws.send(JSON.stringify({
                                      type: 'relay',
                                      sender: peerId,
                                      payload: payload,
                                  }));
                              } catch (e) { }
                          }
                      }
                      break;

                  default:
                      console.warn(`  ⚠ Unknown message type '${data.type}' from ${peerId}`);
              }
          } catch (error) {
              console.error(`  ✕ Error parsing message from ${peerId}:`, error);
          }
      });

      ws.on('close', () => {
          const deadPeer = peers.get(peerId);
          peers.delete(peerId);
          console.log(`✧ Peer disconnected: ${peerId} (${peers.size} remaining)`);

          // Notify only the linked neighbors
          if (deadPeer && deadPeer.links) {
              const linksArray = Array.from(deadPeer.links);
              for (const neighborId of linksArray) {
                  const neighbor = peers.get(neighborId);
                  if (neighbor) {
                      neighbor.links.delete(peerId);
                      if (neighbor.ws.readyState === WebSocket.OPEN) {
                          neighbor.ws.send(JSON.stringify({
                              type: 'peer_left',
                              peerId: peerId,
                          }));
                      }
                  }
              }
          }
      });

      ws.on('error', (error) => {
          console.error(`  ✕ WebSocket error for ${peerId}:`, error);
          peers.delete(peerId);
      });
  });

  // Heartbeat — check for stale connections every 30s
  setInterval(() => {
      const peersArray = Array.from(peers.entries());
      for (const [id, peer] of peersArray) {
          if (peer.ws.readyState !== WebSocket.OPEN) {
              peers.delete(id);
              console.log(`  🔄 Cleaned up stale peer: ${id}`);
          }
      }
  }, 30000);
}
