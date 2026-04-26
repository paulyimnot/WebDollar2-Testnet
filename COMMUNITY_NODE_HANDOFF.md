# 🌐 WebDollar 2: Node Operator Summary (Handoff)

This summary outlines the decentralized incentive structure and the two official deployment methods for WebDollar 2 dedicated nodes.

---

## 💰 THE REWARDS: Why run a node?

Node operators are the backbone of the network and are paid directly from the blockchain emissions:

1.  **6% GLOBAL NODE POOL (Network Salary)**
    *   6% of **TOTAL** network mining emissions are funneled into a treasury.
    *   Paid out once every 24 hours (Midnight UTC).
    *   Shared proportionally between all active nodes.
    *   *Example:* If the network mines 1,000,000 WEBD today, 60,000 WEBD is split among node operators.

2.  **10% BACKBONE FEE (Direct Bonus)**
    *   Nodes earn a 10% fee from the **SPECIFIC** mining rewards of users connected to them.
    *   This is not from the total supply; it is a service fee from your connected users.
    *   Paid immediately into your `OPERATOR_WALLET_ADDRESS` upon each claim.

---

## 🚀 THE METHODS: How to launch?

We have eliminated the complex "Developer" setup to focus on the two most secure and automated paths:

### Method A: One-Click Cloud (Render)
*   **Target Audience:** Non-technical users / Beginners.
*   **Difficulty:** 1/10 (No terminal required).
*   **Execution:** Users click a "Deploy to Render" button, fill in a web form with their wallet and secrets, and the node launches in the cloud.
*   **Security:** Fully sandboxed by Render's infrastructure. No local hardware needed.

### Method B: One-Command Server (Docker Compose)
*   **Target Audience:** Advanced users / VPS owners (Ubuntu, Linux).
*   **Difficulty:** 3/10 (One terminal command).
*   **Execution:** `docker-compose up -d`. This spins up two isolated "containers"—one for the node logic and one for the database.
*   **Security:** Industry-standard isolation. It is the most stable way to run a node 24/7 on your own hardware.

---

## 🔑 REQUIRED SECRETS
Every operator needs:
1.  **`CLUSTER_SECRET`**: The "password" to join the mainnet mesh.
2.  **`OPERATOR_WALLET_ADDRESS`**: The WEBD2 address where the 16% total rewards are sent.
3.  **`SESSION_SECRET`**: A unique key to protect the node's internal sessions.
