# WebDollar 2 — Dedicated Node Setup Guide

By running a dedicated node, you participate in the **DIELBS Multi-Origin Cluster** — a secure mesh of servers that vote on block hashes to achieve network finality. Dedicated nodes are the backbone of WebDollar 2's decentralization.

---

## 💰 Node Operator Rewards

Running a node pays you in two ways:

| Reward | Amount | When |
|--------|--------|------|
| **Global Node Pool** | 6% of all network mining emissions | Paid daily to all active nodes, split proportionally |
| **Backbone Mode Fee** | 10% of mining rewards | Paid instantly from every miner connected through your node |

- If you are the **only active node**, you receive the entire 6% daily pool.
- If there are **100 nodes**, you receive 1% of the pool (1/100th of the 6%).
- The backbone 10% fee is **only deducted** if your node has a configured `OPERATOR_WALLET_ADDRESS`.

---

## 🚀 Choose Your Deployment Method

### Method 1: One-Click Cloud Deploy *(Easiest — No server required)*

Deploy a full node + dedicated database to Render with a single click. No terminal required.

**[Click Here to Deploy to Render](https://render.com/deploy)**

**Steps:**
1. Click the link above and sign in to your Render account.
2. Render will read the `render.yaml` config from this repository automatically.
3. Fill in the required Environment Variables:
   - `SESSION_SECRET` — Any long random string (e.g. 64 random characters)
   - `CLUSTER_SECRET` — Get this from the WebDollar 2 community (**required** to join the mainnet cluster)
   - `CLUSTER_PEERS` — A comma-separated list of existing node URLs (e.g. `https://main.webdollar2.com`)
   - `OPERATOR_WALLET_ADDRESS` — Your WEBD2 wallet address to receive node rewards
4. Click **Apply** — your node and database will be created and started automatically.

> ⚠️ The `CLUSTER_SECRET` must exactly match the one used by other nodes on the network, or your node will be rejected from the cluster.

---

### Method 2: Docker Compose *(Recommended for VPS/Server owners — 1 command)*

If you have your own server (Ubuntu, Debian, macOS, or Windows) with [Docker](https://docs.docker.com/get-docker/) installed.

**Step 1 — Clone the repository**
```bash
git clone https://github.com/paulyimnot/WebDollar2-Testnet.git
cd WebDollar2-Testnet
```

**Step 2 — Create your `.env` file**
```bash
cp .env.example .env
```
Then open `.env` and fill in your values:
```ini
SESSION_SECRET=your_long_random_secret_here
CLUSTER_SECRET=get_this_from_the_webdollar_community
CLUSTER_PEERS=https://existing-node-url.com
OPERATOR_WALLET_ADDRESS=WEBDyourwalletaddresshere
PORT=5000
```

**Step 3 — Start your node**
```bash
docker-compose up -d
```

Docker will automatically:
- Download and start PostgreSQL
- Build the WebDollar 2 application
- Run database migrations
- Start the node and connect to the cluster

**To view your node logs:**
```bash
docker-compose logs -f webdollar2-node
```

**To stop:**
```bash
docker-compose down
```


---


## ✅ Verifying Your Node is Working

When your node starts successfully, you should see logs like:
```
🟢 DIELBS Signaling Server successfully integrated into main process
✅ OPERATOR_WALLET_ADDRESS configured: WEBDyourwal...
🕒 Starting Daily Node Payout Cron Job...
📡 CLUSTER: Initializing with X configured peers...
✅ CLUSTER: Connected to peer https://...
[express] serving on port 5000
```

When your daily node reward is paid out:
```
💰 [NODE PAYOUT] YOUR NODE EARNED: 142.3812 WEBD -> WEBDyourwal...
```

---

## 🔐 Security Checklist

- [ ] `SESSION_SECRET` is a long, unique random string
- [ ] `CLUSTER_SECRET` matches the official network secret
- [ ] `OPERATOR_WALLET_ADDRESS` is your valid WEBD2 wallet address
- [ ] Your `.env` file is **never** committed to Git (it is in `.gitignore`)
- [ ] Port `5000` is open in your server's firewall for inbound connections
- [ ] Your database only accepts connections from your node (not the public internet)

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| `❌ FATAL: CLUSTER_SECRET is not set` | Set `CLUSTER_SECRET` in your `.env` file |
| `⚠️ OPERATOR_WALLET_ADDRESS is not set` | Add your wallet address to earn rewards |
| Node connects but gets rejected by peers | Your `CLUSTER_SECRET` does not match the network |
| `DATABASE_URL not set` | Check your `.env` file has the correct connection string |
| Port already in use | Change `PORT=5001` in your `.env` |

---

Welcome to the decentralized future of WebDollar 2! 🌐
