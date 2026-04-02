"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var PORT = Number(process.env.PORT) || 8080;
var peers = new Map();
var nextId = 1;
var wss = new ws_1.WebSocketServer({ port: PORT, host: '0.0.0.0' });
console.log("\n\uD83D\uDFE2 DIELBS Signaling Server running on port ".concat(PORT));
console.log("   Waiting for peer connections...\n");
wss.on('connection', function (ws) {
    var peerId = "peer-".concat(nextId++);
    peers.set(peerId, { ws: ws, id: peerId, links: new Set() });
    console.log("\u2726 Peer connected: ".concat(peerId, " (").concat(peers.size, " total)"));
    // Assign max 8 random peers to create a stable P2P mesh graph
    var MAX_PEERS = 8;
    var existingPeerIds = Array.from(peers.keys()).filter(function (id) { return id !== peerId; });
    var shuffled = existingPeerIds.sort(function () { return 0.5 - Math.random(); });
    var selectedPeers = shuffled.slice(0, MAX_PEERS);
    // Bidirectional mesh links
    selectedPeers.forEach(function (targetId) {
        peers.get(peerId).links.add(targetId);
        peers.get(targetId).links.add(peerId);
        // Alert the existing peer that a new node linked to them
        var existingPeer = peers.get(targetId);
        if (existingPeer && existingPeer.ws.readyState === ws_1.WebSocket.OPEN) {
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
    ws.on('message', function (raw) {
        var e_1, _a;
        var _b;
        try {
            var data = JSON.parse(raw.toString());
            // Validate message structure
            if (!data || typeof data.type !== 'string') {
                console.warn("  \u26A0 Malformed message from ".concat(peerId));
                return;
            }
            switch (data.type) {
                case 'broadcast':
                    // Route Gossip Protocol data out to linked mesh peers only
                    var payload = data.payload || data.data; // Support both payload formats
                    if (!payload) {
                        console.warn("  \u26A0 Invalid broadcast from ".concat(peerId, " \u2014 missing payload"));
                        return;
                    }
                    var myLinks = (_b = peers.get(peerId)) === null || _b === void 0 ? void 0 : _b.links;
                    if (!myLinks)
                        return;
                    try {
                        for (var myLinks_1 = __values(myLinks), myLinks_1_1 = myLinks_1.next(); !myLinks_1_1.done; myLinks_1_1 = myLinks_1.next()) {
                            var targetId = myLinks_1_1.value;
                            var targetPeer = peers.get(targetId);
                            if (targetPeer && targetPeer.ws.readyState === ws_1.WebSocket.OPEN) {
                                try {
                                    targetPeer.ws.send(JSON.stringify({
                                        type: 'relay',
                                        sender: peerId,
                                        payload: payload,
                                    }));
                                }
                                catch (e) { }
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (myLinks_1_1 && !myLinks_1_1.done && (_a = myLinks_1.return)) _a.call(myLinks_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    break;
                default:
                    console.warn("  \u26A0 Unknown message type '".concat(data.type, "' from ").concat(peerId));
            }
        }
        catch (error) {
            console.error("  \u2715 Error parsing message from ".concat(peerId, ":"), error);
        }
    });
    ws.on('close', function () {
        var e_2, _a;
        var deadPeer = peers.get(peerId);
        peers.delete(peerId);
        console.log("\u2727 Peer disconnected: ".concat(peerId, " (").concat(peers.size, " remaining)"));
        // Notify only the linked neighbors
        if (deadPeer && deadPeer.links) {
            try {
                for (var _b = __values(deadPeer.links), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var neighborId = _c.value;
                    var neighbor = peers.get(neighborId);
                    if (neighbor) {
                        neighbor.links.delete(peerId);
                        if (neighbor.ws.readyState === ws_1.WebSocket.OPEN) {
                            neighbor.ws.send(JSON.stringify({
                                type: 'peer_left',
                                peerId: peerId,
                            }));
                        }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    });
    ws.on('error', function (error) {
        console.error("  \u2715 WebSocket error for ".concat(peerId, ":"), error);
        peers.delete(peerId);
    });
});
// Heartbeat — check for stale connections every 30s
setInterval(function () {
    var e_3, _a;
    try {
        for (var peers_1 = __values(peers), peers_1_1 = peers_1.next(); !peers_1_1.done; peers_1_1 = peers_1.next()) {
            var _b = __read(peers_1_1.value, 2), id = _b[0], peer = _b[1];
            if (peer.ws.readyState !== ws_1.WebSocket.OPEN) {
                peers.delete(id);
                console.log("  \uD83D\uDD04 Cleaned up stale peer: ".concat(id));
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (peers_1_1 && !peers_1_1.done && (_a = peers_1.return)) _a.call(peers_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
}, 30000);
// Graceful shutdown
process.on('SIGINT', function () {
    console.log('\n🔴 Shutting down signaling server...');
    wss.close();
    process.exit(0);
});
