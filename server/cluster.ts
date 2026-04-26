import { WebSocket } from "ws";

/**
 * DIELBS MULTI-ORIGIN CLUSTER MANAGER
 * 
 * Objective: Finality Decentralization between geo-distributed servers.
 * Servers establish a secure mesh to "Vote" on block hashes before finality is achieved.
 */

interface ServerPeer {
  url: string;
  ws: WebSocket | null;
  id: string;
  status: 'connecting' | 'connected' | 'offline';
  lastHeartbeat: number;
}

class ClusterManager {
  private peers: Map<string, ServerPeer> = new Map();
  private serverId: string = process.env.RENDER_INSTANCE_ID || `server-${Math.random().toString(36).substring(7)}`;
  private peerUrls: string[] = (process.env.CLUSTER_PEERS || "").split(",").filter(Boolean);

  constructor() {
    this.peerUrls.forEach(url => {
      this.peers.set(url, {
        url,
        ws: null,
        id: 'unknown',
        status: 'offline',
        lastHeartbeat: 0
      });
    });
  }

  public init() {
    if (this.peerUrls.length === 0) {
      console.log("📡 CLUSTER: Running in Single-Node mode. No peers configured.");
      return;
    }

    console.log(`📡 CLUSTER: Initializing with ${this.peerUrls.length} configured peers...`);
    this.connectSubLoop();
    setInterval(() => this.connectSubLoop(), 30000);
  }

  private connectSubLoop() {
    this.peers.forEach((peer, url) => {
      if (peer.status === 'offline') {
        this.attemptConnection(peer);
      }
    });
  }

  private attemptConnection(peer: ServerPeer) {
    try {
      // Connect to the /ws endpoint of the peer server
      const clusterSecret = process.env.CLUSTER_SECRET;
      if (!clusterSecret || clusterSecret === 'insecure_default') {
        console.error("❌ FATAL: CLUSTER_SECRET is not set or is using the insecure default. This node refuses to join the cluster.");
        peer.status = 'offline';
        return;
      }
      const wsUrl = peer.url.replace('http', 'ws') + '/ws';
      const ws = new WebSocket(wsUrl, {
        headers: {
          'x-dielbs-server-id': this.serverId,
          'x-dielbs-auth': clusterSecret
        }
      });

      peer.ws = ws;
      peer.status = 'connecting';

      ws.on('open', () => {
        console.log(`✅ CLUSTER: Connected to peer ${peer.url}`);
        peer.status = 'connected';
        peer.lastHeartbeat = Date.now();
        
        // Identify ourselves
        ws.send(JSON.stringify({
          type: 'cluster_handshake',
          serverId: this.serverId,
          version: '2.0.0-dist'
        }));
      });

      ws.on('message', (data) => {
        this.handleClusterMessage(peer, data.toString());
      });

      ws.on('close', () => {
        peer.status = 'offline';
        peer.ws = null;
      });

      ws.on('error', () => {
        peer.status = 'offline';
        peer.ws = null;
      });

    } catch (e) {
      peer.status = 'offline';
    }
  }

  private handleClusterMessage(peer: ServerPeer, raw: string) {
    try {
      const msg = JSON.parse(raw);
      switch (msg.type) {
        case 'cluster_handshake':
          peer.id = msg.serverId;
          break;
        case 'vote_request':
          // Another server wants us to verify a block hash
          this.processVoteRequest(msg);
          break;
      }
    } catch (e) {}
  }

  private processVoteRequest(msg: any) {
    // Logic to verify history against local DB then reply with 'vote_cast'
    console.log(`🗳️ CLUSTER: Received vote request for block ${msg.blockId} hash ${msg.hash}`);
  }

  /**
   * Broadcast a transaction or block hash to all peers for parallel validation
   */
  public broadcast(payload: any) {
    const data = JSON.stringify(payload);
    this.peers.forEach(peer => {
      if (peer.status === 'connected' && peer.ws) {
        peer.ws.send(data);
      }
    });
  }
}

export const clusterManager = new ClusterManager();
