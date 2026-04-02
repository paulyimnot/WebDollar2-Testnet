"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/blockchain.ts
var blockchain_exports = {};
__export(blockchain_exports, {
  USE_TESTNET: () => USE_TESTNET,
  WDOLLAR2_TOKEN_ABI: () => WDOLLAR2_TOKEN_ABI,
  checkConnection: () => checkConnection,
  deployToken: () => deployToken,
  derivePolygonAddress: () => derivePolygonAddress,
  getContractAddress: () => getContractAddress,
  getMaticBalance: () => getMaticBalance,
  getOnChainBalance: () => getOnChainBalance,
  getPolygonscanBaseUrl: () => getPolygonscanBaseUrl,
  getProvider: () => getProvider,
  getRecentBlocks: () => getRecentBlocks,
  getRecentTransactionsFromBlock: () => getRecentTransactionsFromBlock,
  getTokenContract: () => getTokenContract,
  getWalletSigner: () => getWalletSigner,
  mintTokens: () => mintTokens,
  setContractAddress: () => setContractAddress,
  transferTokens: () => transferTokens
});
function getRpcUrl() {
  const key = process.env.ALCHEMY_API_KEY;
  if (key) {
    return USE_TESTNET ? `https://polygon-amoy.g.alchemy.com/v2/${key}` : `https://polygon-mainnet.g.alchemy.com/v2/${key}`;
  }
  return USE_TESTNET ? "https://rpc-amoy.polygon.technology" : "https://polygon-rpc.com";
}
function getProvider() {
  if (!provider) {
    const network = USE_TESTNET ? import_ethers2.ethers.Network.from(80002) : import_ethers2.ethers.Network.from(137);
    provider = new import_ethers2.ethers.JsonRpcProvider(getRpcUrl(), network, {
      staticNetwork: true
    });
  }
  return provider;
}
function derivePolygonAddress(privateKeyHex) {
  const wallet = new import_ethers2.ethers.Wallet(privateKeyHex);
  return wallet.address;
}
function getWalletSigner(privateKeyHex) {
  return new import_ethers2.ethers.Wallet(privateKeyHex, getProvider());
}
function setContractAddress(address) {
  contractAddress = address;
}
function getContractAddress() {
  return contractAddress;
}
function getTokenContract(signerOrProvider) {
  if (!contractAddress) return null;
  return new import_ethers2.ethers.Contract(
    contractAddress,
    WDOLLAR2_TOKEN_ABI,
    signerOrProvider || getProvider()
  );
}
async function getOnChainBalance(polygonAddress) {
  const contract = getTokenContract();
  if (!contract) return "0";
  try {
    const balance = await contract.balanceOf(polygonAddress);
    return import_ethers2.ethers.formatUnits(balance, 18);
  } catch {
    return "0";
  }
}
async function getMaticBalance(polygonAddress) {
  try {
    const balance = await getProvider().getBalance(polygonAddress);
    return import_ethers2.ethers.formatEther(balance);
  } catch {
    return "0";
  }
}
async function deployToken(deployerPrivateKey) {
  const signer = getWalletSigner(deployerPrivateKey);
  const factory = new import_ethers2.ethers.ContractFactory(
    WDOLLAR2_TOKEN_ABI,
    WDOLLAR2_TOKEN_BYTECODE,
    signer
  );
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  contractAddress = address;
  return address;
}
async function transferTokens(senderPrivateKey, recipientAddress, amount) {
  const signer = getWalletSigner(senderPrivateKey);
  const contract = getTokenContract(signer);
  if (!contract) throw new Error("Token contract not deployed");
  const amountWei = import_ethers2.ethers.parseUnits(amount, 18);
  const tx = await contract.transfer(recipientAddress, amountWei);
  const receipt = await tx.wait();
  return receipt.hash;
}
async function mintTokens(ownerPrivateKey, recipientAddress, amount) {
  const signer = getWalletSigner(ownerPrivateKey);
  const contract = getTokenContract(signer);
  if (!contract) throw new Error("Token contract not deployed");
  const amountWei = import_ethers2.ethers.parseUnits(amount, 18);
  const tx = await contract.mint(recipientAddress, amountWei);
  const receipt = await tx.wait();
  return receipt.hash;
}
async function checkConnection() {
  try {
    const p = getProvider();
    const network = await p.getNetwork();
    const blockNumber = await p.getBlockNumber();
    return {
      connected: true,
      network: USE_TESTNET ? "WD2 TESTNET (DIELBS)" : "WD2 MAINNET (L1)",
      chainId: Number(network.chainId),
      blockNumber
    };
  } catch (err) {
    return {
      connected: false,
      network: USE_TESTNET ? "WD2 TESTNET (DIELBS)" : "WD2 MAINNET (L1)",
      chainId: null,
      blockNumber: null
    };
  }
}
function getPolygonscanBaseUrl() {
  return USE_TESTNET ? "https://amoy.polygonscan.com" : "https://polygonscan.com";
}
async function getRecentBlocks(count = 10) {
  try {
    const p = getProvider();
    const latestBlockNumber = await p.getBlockNumber();
    const blocks3 = [];
    const fetchCount = Math.min(count, 20);
    for (let i = 0; i < fetchCount; i++) {
      const block = await p.getBlock(latestBlockNumber - i);
      if (block) {
        blocks3.push({
          number: block.number,
          hash: block.hash || "",
          timestamp: block.timestamp,
          transactionCount: block.transactions.length,
          miner: block.miner || "0x0000000000000000000000000000000000000000",
          gasUsed: block.gasUsed.toString()
        });
      }
    }
    return blocks3;
  } catch {
    return [];
  }
}
async function getRecentTransactionsFromBlock(blockNumber, limit = 5) {
  try {
    const p = getProvider();
    const block = await p.getBlock(blockNumber, true);
    if (!block || !block.prefetchedTransactions) return [];
    return block.prefetchedTransactions.slice(0, limit).map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: import_ethers2.ethers.formatEther(tx.value),
      blockNumber: tx.blockNumber || blockNumber
    }));
  } catch {
    return [];
  }
}
var import_ethers2, USE_TESTNET, WDOLLAR2_TOKEN_ABI, WDOLLAR2_TOKEN_BYTECODE, provider, contractAddress;
var init_blockchain = __esm({
  "server/blockchain.ts"() {
    "use strict";
    import_ethers2 = require("ethers");
    USE_TESTNET = true;
    console.log("-----------------------------------------");
    console.log("BLOCKCHAIN MODULE INITIALIZING [v.MAR22.FIX]");
    console.log("-----------------------------------------");
    WDOLLAR2_TOKEN_ABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function transferFrom(address from, address to, uint256 amount) returns (bool)",
      "function mint(address to, uint256 amount)",
      "function owner() view returns (address)",
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Approval(address indexed owner, address indexed spender, uint256 value)"
    ];
    WDOLLAR2_TOKEN_BYTECODE = "0x60806040523480156200001157600080fd5b506040518060400160405280600b81526020017f576562446f6c6c61722032000000000000000000000000000000000000000000815250604051806040016040528060048152602001635745424460e01b81525081600390816200007591906200019b565b5060046200008482826200019b565b5050506200009f336b0de0b6b3a7640000000000006200010a565b620000c933620000b26012600a62000380565b620000c49065098bca5a000062000398565b6200010a565b620000f333620000dc6012600a62000380565b620000ee9064e8d4a5100062000398565b6200010a565b600580546001600160a01b03191633179055620003c8565b6001600160a01b038216620001445760405163ec442f0560e01b8152600060048201526024015b60405180910390fd5b620001526000838362000156565b5050565b6001600160a01b0383166200018557806002600082825462000179919062000398565b90915550620001f99050565b6001600160a01b03831660009081526020819052604090205481811015620001da5760405163391434e360e21b81526001600160a01b038516600482015260248101829052604481018390526064016200013b565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b038216620002175760028054829003905562000236565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516200027b91815260200190565b60405180910390a3505050565b634e487b7160e01b600052604160045260246000fd5b600181811c90821680620002b357607f821691505b602082108103620002d457634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200032857600081815260208120601f850160051c81016020861015620003035750805b601f850160051c820191505b8181101562000324578281556001016200030f565b5050505b505050565b81516001600160401b0381111562000349576200034962000288565b62000361816200035a84546200029e565b84620002da565b602080601f831160018114620003995760008415620003805750858301515b600019600386901b1c1916600184901b17855562000324565b600085815260208120601f198616915b82811015620003ca57888601518255948401946001909101908401620003a9565b5085821015620003e95787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b634e487b7160e01b600052601160045260246000fd5b600181815b808511156200044e57816000190482111562000432576200043262000403565b808516156200044057918102915b93841c93908002906200041e565b509250929050565b600082620004675750600162000506565b81620004765750600062000506565b81600181146200048f57600281146200049a57620004ba565b600191505062000506565b60ff841115620004ae57620004ae62000403565b50506001821b62000506565b5060208310610133831016604e8410600b8410161715620004df575081810a62000506565b620004eb838362000419565b806000190482111562000502576200050262000403565b0290505b92915050565b60006200051d60ff84168362000456565b9392505050565b808202811582820484141762000506576200050662000403565b610787806200054e6000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c806370a082311161007157806370a082311461014a57806395d89b4114610173578063a9059cbb1461017b578063dd62ed3e1461018e578063f2fde38b146101c7578063f40f8aef146101da57600080fd5b806306fdde03146100b9578063095ea7b3146100d757806318160ddd146100fa57806323b872dd1461010c578063313ce5671461011f57806340c10f191461013557600080fd5b600080fd5b6100c16101ed565b6040516100ce91906105a4565b60405180910390f35b6100ea6100e53660046105f9565b61027f565b60405190151581526020016100ce565b6002545b6040519081526020016100ce565b6100ea61011a366004610623565b610299565b60126040516100ce919061065f565b610148610143366004610673565b6102bd565b005b6100fe610158366004610695565b6001600160a01b031660009081526020819052604090205490565b6100c1610313565b6100ea6101893660046105f9565b610322565b6100fe61019c3660046106b7565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6101486101d5366004610695565b610330565b6101486101e83660046105f9565b61036c565b6060600380546101fc906106ea565b80601f0160208091040260200160405190810160405280929190818152602001828054610228906106ea565b80156102755780601f1061024a57610100808354040283529160200191610275565b820191906000526020600020905b81548152906001019060200180831161025857829003601f168201915b5050505050905090565b60003361028d8185856103be565b60019150505b92915050565b6000336102a78582856103d0565b6102b2858585610448565b506001949350505050565b6005546001600160a01b031633146102f85760405163118cdaa760e01b81523360048201526024015b60405180910390fd5b61030e82826b0de0b6b3a764000000000000610448565b505050565b6060600480546101fc906106ea565b60003361028d818585610448565b6005546001600160a01b0316331461035e5760405163118cdaa760e01b81523360048201526024016102ef565b600580546001600160a01b0319166001600160a01b0392909216919091179055565b6005546001600160a01b031633146103b35760405163118cdaa760e01b81523360048201526024016102ef565b61030e8282600062000156565b61030e83838360016104a7565b6001600160a01b038381166000908152600160209081526040808320938616835292905220546000198114610442578181101561043357604051637dc7a0d960e11b81526001600160a01b038416600482015260248101829052604481018390526064016102ef565b610442848484840360006104a7565b50505050565b6001600160a01b03831661047257604051634b637e8f60e11b8152600060048201526024016102ef565b6001600160a01b03821661049c5760405163ec442f0560e01b8152600060048201526024016102ef565b61030e83838361057c565b6001600160a01b0384166104d15760405163e602df0560e01b8152600060048201526024016102ef565b6001600160a01b0383166104fb57604051634a1406b160e11b8152600060048201526024016102ef565b6001600160a01b038085166000908152600160209081526040808320938716835292905220829055801561044257826001600160a01b0316846001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161056d91815260200190565b60405180910390a350505050565b505050565b600060208083528351808285015260005b818110156105b157858101830151858201604001528201610595565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b03811681146105e857600080fd5b919050565b6000602082840312156105ff57600080fd5b610608826105d2565b9392505050565b6000806040838503121561062257600080fd5b61062b836105d2565b946020939093013593505050565b60008060006060848603121561064e57600080fd5b610657846105d2565b925061066560208501610660565b9150604084013590509250925092565b6000806040838503121561068857600080fd5b610691836105d2565b915060208301356001600160a01b03811681146106ad57600080fd5b8093505050604051806040016040528060048152602001635745424460e01b815250925050509250929050565b6000602082840312156106eb57600080fd5b610608826105d2565b60008060408385031215610707600080fd5b610710836105d2565b915061071e602084016105d2565b90509250929050565b600181811c9082168061073b57607f821691505b60208210810361075b57634e487b7160e01b600052602260045260246000fd5b5091905056fea164736f6c6343000814000a";
    provider = null;
    contractAddress = null;
  }
});

// server/stripeClient.ts
var stripeClient_exports = {};
__export(stripeClient_exports, {
  getStripePublishableKey: () => getStripePublishableKey,
  getStripeSecretKey: () => getStripeSecretKey,
  getStripeSync: () => getStripeSync,
  getUncachableStripeClient: () => getUncachableStripeClient
});
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }
  const connectorName = "stripe";
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", connectorName);
  url.searchParams.set("environment", targetEnvironment);
  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "X_REPLIT_TOKEN": xReplitToken
    }
  });
  const data = await response.json();
  connectionSettings = data.items?.[0];
  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }
  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret
  };
}
async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new import_stripe.default(secretKey, {
    apiVersion: "2025-08-27.basil"
  });
}
async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}
async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}
async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import("stripe-replit-sync");
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL,
        max: 2
      },
      stripeSecretKey: secretKey
    });
  }
  return stripeSync;
}
var import_stripe, connectionSettings, stripeSync;
var init_stripeClient = __esm({
  "server/stripeClient.ts"() {
    "use strict";
    import_stripe = __toESM(require("stripe"), 1);
    stripeSync = null;
  }
});

// vite.config.ts
var import_vite, import_plugin_react, import_path2, import_vite_plugin_runtime_error_modal, vite_config_default;
var init_vite_config = __esm({
  "vite.config.ts"() {
    "use strict";
    import_vite = require("vite");
    import_plugin_react = __toESM(require("@vitejs/plugin-react"), 1);
    import_path2 = __toESM(require("path"), 1);
    import_vite_plugin_runtime_error_modal = __toESM(require("@replit/vite-plugin-runtime-error-modal"), 1);
    vite_config_default = (0, import_vite.defineConfig)({
      plugins: [
        (0, import_plugin_react.default)(),
        (0, import_vite_plugin_runtime_error_modal.default)(),
        ...false ? [
          null.then(
            (m) => m.cartographer()
          ),
          null.then(
            (m) => m.devBanner()
          )
        ] : []
      ],
      resolve: {
        alias: {
          "@": import_path2.default.resolve(process.cwd(), "client", "src"),
          "@shared": import_path2.default.resolve(process.cwd(), "shared"),
          "@assets": import_path2.default.resolve(process.cwd(), "attached_assets")
        }
      },
      root: import_path2.default.resolve(process.cwd(), "client"),
      build: {
        target: "esnext",
        minify: false,
        outDir: import_path2.default.resolve(process.cwd(), "dist", "public"),
        emptyOutDir: true
      },
      server: {
        fs: {
          strict: true,
          deny: ["**/.*"]
        }
      },
      optimizeDeps: {
        include: ["date-fns"]
      }
    });
  }
});

// node_modules/nanoid/url-alphabet/index.js
var urlAlphabet;
var init_url_alphabet = __esm({
  "node_modules/nanoid/url-alphabet/index.js"() {
    urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
  }
});

// node_modules/nanoid/index.js
var import_crypto4, POOL_SIZE_MULTIPLIER, pool2, poolOffset, fillPool, nanoid;
var init_nanoid = __esm({
  "node_modules/nanoid/index.js"() {
    import_crypto4 = __toESM(require("crypto"), 1);
    init_url_alphabet();
    POOL_SIZE_MULTIPLIER = 128;
    fillPool = (bytes) => {
      if (!pool2 || pool2.length < bytes) {
        pool2 = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
        import_crypto4.default.randomFillSync(pool2);
        poolOffset = 0;
      } else if (poolOffset + bytes > pool2.length) {
        import_crypto4.default.randomFillSync(pool2);
        poolOffset = 0;
      }
      poolOffset += bytes;
    };
    nanoid = (size = 21) => {
      fillPool(size |= 0);
      let id = "";
      for (let i = poolOffset - size; i < poolOffset; i++) {
        id += urlAlphabet[pool2[i] & 63];
      }
      return id;
    };
  }
});

// server/vite.ts
var vite_exports = {};
__export(vite_exports, {
  setupVite: () => setupVite
});
async function setupVite(server, app2) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true
  };
  const vite = await (0, import_vite2.createServer)({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = import_path3.default.resolve(
        import_meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await import_fs2.default.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
var import_vite2, import_fs2, import_path3, import_meta, viteLogger;
var init_vite = __esm({
  "server/vite.ts"() {
    "use strict";
    import_vite2 = require("vite");
    init_vite_config();
    import_fs2 = __toESM(require("fs"), 1);
    import_path3 = __toESM(require("path"), 1);
    init_nanoid();
    import_meta = {};
    viteLogger = (0, import_vite2.createLogger)();
  }
});

// server/index.ts
var index_exports = {};
__export(index_exports, {
  log: () => log
});
module.exports = __toCommonJS(index_exports);
var import_express2 = __toESM(require("express"), 1);

// server/db.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"), 1);

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bannedIps: () => bannedIps,
  blockedWallets: () => blockedWallets,
  blocks: () => blocks,
  cardWaitlist: () => cardWaitlist,
  casinoSweepstakes: () => casinoSweepstakes,
  conversations: () => conversations,
  conversionRequests: () => conversionRequests,
  faucetClaimLog: () => faucetClaimLog,
  insertCardWaitlistSchema: () => insertCardWaitlistSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertConversionSchema: () => insertConversionSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertUserSchema: () => insertUserSchema,
  insertWalletAddressSchema: () => insertWalletAddressSchema,
  messages: () => messages,
  registrationIpLog: () => registrationIpLog,
  transactions: () => transactions,
  users: () => users,
  walletAddresses: () => walletAddresses
});
var import_pg_core2 = require("drizzle-orm/pg-core");
var import_drizzle_zod2 = require("drizzle-zod");

// shared/models/chat.ts
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var import_drizzle_orm = require("drizzle-orm");
var conversations = (0, import_pg_core.pgTable)("conversations", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  title: (0, import_pg_core.text)("title").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").default(import_drizzle_orm.sql`CURRENT_TIMESTAMP`).notNull()
});
var messages = (0, import_pg_core.pgTable)("messages", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  conversationId: (0, import_pg_core.integer)("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: (0, import_pg_core.text)("role").notNull(),
  content: (0, import_pg_core.text)("content").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").default(import_drizzle_orm.sql`CURRENT_TIMESTAMP`).notNull()
});
var insertConversationSchema = (0, import_drizzle_zod.createInsertSchema)(conversations).omit({
  id: true,
  createdAt: true
});
var insertMessageSchema = (0, import_drizzle_zod.createInsertSchema)(messages).omit({
  id: true,
  createdAt: true
});

// shared/schema.ts
var users = (0, import_pg_core2.pgTable)("users", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  username: (0, import_pg_core2.text)("username").notNull().unique(),
  password: (0, import_pg_core2.text)("password").notNull(),
  walletAddress: (0, import_pg_core2.text)("wallet_address").unique(),
  polygonAddress: (0, import_pg_core2.text)("polygon_address"),
  balance: (0, import_pg_core2.numeric)("balance", { precision: 20, scale: 4 }).default("0"),
  stakedBalance: (0, import_pg_core2.numeric)("staked_balance", { precision: 20, scale: 4 }).default("0"),
  lastStakeRewardClaim: (0, import_pg_core2.timestamp)("last_stake_reward_claim"),
  isDev: (0, import_pg_core2.boolean)("is_dev").default(false),
  isFoundation: (0, import_pg_core2.boolean)("is_foundation").default(false),
  totpSecret: (0, import_pg_core2.text)("totp_secret"),
  is2faEnabled: (0, import_pg_core2.boolean)("is_2fa_enabled").default(false),
  alias: (0, import_pg_core2.text)("alias").unique(),
  isAliasActive: (0, import_pg_core2.boolean)("is_alias_active").default(false),
  createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
});
var walletAddresses = (0, import_pg_core2.pgTable)("wallet_addresses", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  userId: (0, import_pg_core2.integer)("user_id").references(() => users.id).notNull(),
  label: (0, import_pg_core2.text)("label").notNull().default("Default"),
  address: (0, import_pg_core2.text)("address").notNull().unique(),
  polygonAddress: (0, import_pg_core2.text)("polygon_address"),
  publicKey: (0, import_pg_core2.text)("public_key").notNull(),
  encryptedPrivateKey: (0, import_pg_core2.text)("encrypted_private_key").notNull(),
  mnemonic: (0, import_pg_core2.text)("mnemonic").notNull(),
  balance: (0, import_pg_core2.numeric)("balance", { precision: 20, scale: 4 }).default("0"),
  isLocked: (0, import_pg_core2.boolean)("is_locked").default(false),
  isPrimary: (0, import_pg_core2.boolean)("is_primary").default(false),
  createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
});
var conversionRequests = (0, import_pg_core2.pgTable)("conversion_requests", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  userId: (0, import_pg_core2.integer)("user_id").references(() => users.id),
  oldWalletAddress: (0, import_pg_core2.text)("old_wallet_address").notNull(),
  amountClaimed: (0, import_pg_core2.numeric)("amount_claimed", { precision: 20, scale: 4 }).notNull(),
  amountApproved: (0, import_pg_core2.numeric)("amount_approved", { precision: 20, scale: 4 }),
  txProof: (0, import_pg_core2.text)("tx_proof"),
  status: (0, import_pg_core2.text)("status", { enum: ["pending", "approved", "rejected", "vesting"] }).default("pending"),
  vestingReleaseDate: (0, import_pg_core2.timestamp)("vesting_release_date"),
  createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
});
var blockedWallets = (0, import_pg_core2.pgTable)("blocked_wallets", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  address: (0, import_pg_core2.text)("address").notNull().unique(),
  reason: (0, import_pg_core2.text)("reason").default("Old dev wallet - blocked"),
  createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
});
var casinoSweepstakes = (0, import_pg_core2.pgTable)("casino_sweepstakes", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  walletAddress: (0, import_pg_core2.text)("wallet_address").notNull(),
  game: (0, import_pg_core2.text)("game").notNull(),
  amountWon: (0, import_pg_core2.numeric)("amount_won", { precision: 20, scale: 4 }).notNull(),
  status: (0, import_pg_core2.text)("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
});
var registrationIpLog = (0, import_pg_core2.pgTable)("registration_ip_log", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  ip: (0, import_pg_core2.text)("ip").notNull().unique(),
  createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
});
var faucetClaimLog = (0, import_pg_core2.pgTable)("faucet_claim_log", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  ip: (0, import_pg_core2.text)("ip").notNull().unique(),
  walletAddress: (0, import_pg_core2.text)("wallet_address").notNull(),
  lastClaimAt: (0, import_pg_core2.timestamp)("last_claim_at").defaultNow()
});
var bannedIps = (0, import_pg_core2.pgTable)("banned_ips", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  ip: (0, import_pg_core2.text)("ip").notNull().unique(),
  reason: (0, import_pg_core2.text)("reason").default("Violation of Terms"),
  createdAt: (0, import_pg_core2.timestamp)("created_at").defaultNow()
});
var blocks = (0, import_pg_core2.pgTable)("blocks", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  hash: (0, import_pg_core2.text)("hash").notNull(),
  previousHash: (0, import_pg_core2.text)("previous_hash").notNull(),
  minerId: (0, import_pg_core2.integer)("miner_id").references(() => users.id),
  reward: (0, import_pg_core2.numeric)("reward", { precision: 20, scale: 4 }).notNull(),
  difficulty: (0, import_pg_core2.integer)("difficulty").default(1),
  nonce: (0, import_pg_core2.integer)("nonce").default(0),
  timestamp: (0, import_pg_core2.timestamp)("timestamp").defaultNow()
});
var transactions = (0, import_pg_core2.pgTable)("transactions", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  senderId: (0, import_pg_core2.integer)("sender_id").references(() => users.id),
  receiverId: (0, import_pg_core2.integer)("receiver_id").references(() => users.id),
  senderAddress: (0, import_pg_core2.text)("sender_address"),
  receiverAddress: (0, import_pg_core2.text)("receiver_address"),
  amount: (0, import_pg_core2.numeric)("amount", { precision: 20, scale: 4 }).notNull(),
  type: (0, import_pg_core2.text)("type", { enum: ["transfer", "mining_reward", "staking_reward", "conversion", "fee", "purchase"] }).notNull(),
  blockId: (0, import_pg_core2.integer)("block_id").references(() => blocks.id),
  timestamp: (0, import_pg_core2.timestamp)("timestamp").defaultNow()
});
var insertUserSchema = (0, import_drizzle_zod2.createInsertSchema)(users).omit({
  id: true,
  createdAt: true,
  balance: true,
  walletAddress: true,
  stakedBalance: true,
  lastStakeRewardClaim: true
});
var insertConversionSchema = (0, import_drizzle_zod2.createInsertSchema)(conversionRequests).omit({
  id: true,
  userId: true,
  amountApproved: true,
  status: true,
  vestingReleaseDate: true,
  createdAt: true
});
var insertWalletAddressSchema = (0, import_drizzle_zod2.createInsertSchema)(walletAddresses).omit({
  id: true,
  createdAt: true,
  balance: true,
  isLocked: true
});
var cardWaitlist = (0, import_pg_core2.pgTable)("card_waitlist", {
  id: (0, import_pg_core2.serial)("id").primaryKey(),
  userId: (0, import_pg_core2.integer)("user_id").notNull().references(() => users.id),
  email: (0, import_pg_core2.text)("email").notNull()
});
var insertCardWaitlistSchema = (0, import_drizzle_zod2.createInsertSchema)(cardWaitlist).omit({
  id: true
});

// server/db.ts
var { Pool } = import_pg.default;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// server/storage.ts
var import_drizzle_orm2 = require("drizzle-orm");
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.username, username));
    return user;
  }
  async getUserByAlias(alias) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.alias, alias));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUserPassword(userId, hashedPassword) {
    const [user] = await db.update(users).set({ password: hashedPassword }).where((0, import_drizzle_orm2.eq)(users.id, userId)).returning();
    return user;
  }
  async updateUser2FA(userId, totpSecret, is2faEnabled) {
    const [user] = await db.update(users).set({ totpSecret, is2faEnabled }).where((0, import_drizzle_orm2.eq)(users.id, userId)).returning();
    return user;
  }
  async updateUserAlias(userId, alias, isAliasActive) {
    const [user] = await db.update(users).set({ alias, isAliasActive }).where((0, import_drizzle_orm2.eq)(users.id, userId)).returning();
    return user;
  }
  async updateUserBalance(userId, newBalance) {
    const [user] = await db.update(users).set({ balance: newBalance }).where((0, import_drizzle_orm2.eq)(users.id, userId)).returning();
    return user;
  }
  async createWalletAddress(data) {
    const [addr] = await db.insert(walletAddresses).values(data).returning();
    return addr;
  }
  async getWalletAddresses(userId) {
    return await db.select().from(walletAddresses).where((0, import_drizzle_orm2.eq)(walletAddresses.userId, userId)).orderBy((0, import_drizzle_orm2.desc)(walletAddresses.isPrimary));
  }
  async getWalletAddress(id) {
    const [addr] = await db.select().from(walletAddresses).where((0, import_drizzle_orm2.eq)(walletAddresses.id, id));
    return addr;
  }
  async updateWalletAddress(id, data) {
    const [addr] = await db.update(walletAddresses).set(data).where((0, import_drizzle_orm2.eq)(walletAddresses.id, id)).returning();
    return addr;
  }
  async deleteWalletAddress(id) {
    await db.delete(walletAddresses).where((0, import_drizzle_orm2.eq)(walletAddresses.id, id));
  }
  async createBlock(block) {
    const [newBlock] = await db.insert(blocks).values(block).returning();
    return newBlock;
  }
  async getLatestBlock() {
    const [block] = await db.select().from(blocks).orderBy((0, import_drizzle_orm2.desc)(blocks.id)).limit(1);
    return block;
  }
  async getBlocks(limit = 10) {
    return await db.select().from(blocks).orderBy((0, import_drizzle_orm2.desc)(blocks.id)).limit(limit);
  }
  async createTransaction(tx) {
    const [newTx] = await db.insert(transactions).values(tx).returning();
    return newTx;
  }
  async getTransactions(limit = 10) {
    return await db.select().from(transactions).orderBy((0, import_drizzle_orm2.desc)(transactions.id)).limit(limit);
  }
  async getUserTransactions(userId) {
    return await db.select().from(transactions).where((0, import_drizzle_orm2.or)((0, import_drizzle_orm2.eq)(transactions.senderId, userId), (0, import_drizzle_orm2.eq)(transactions.receiverId, userId))).orderBy((0, import_drizzle_orm2.desc)(transactions.id)).limit(20);
  }
  async createConversionRequest(request) {
    const [req] = await db.insert(conversionRequests).values(request).returning();
    return req;
  }
  async getConversionRequests(userId) {
    return await db.select().from(conversionRequests).where((0, import_drizzle_orm2.eq)(conversionRequests.userId, userId));
  }
  async getTotalConverted(userId) {
    const requests = await db.select().from(conversionRequests).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(conversionRequests.userId, userId), (0, import_drizzle_orm2.eq)(conversionRequests.status, "approved")));
    return requests.reduce((sum, r) => sum + parseFloat(r.amountApproved || "0"), 0);
  }
  async getTotalPendingConversions(userId) {
    const requests = await db.select().from(conversionRequests).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(conversionRequests.userId, userId), (0, import_drizzle_orm2.eq)(conversionRequests.status, "pending")));
    return requests.reduce((sum, r) => sum + parseFloat(r.amountClaimed || "0"), 0);
  }
  async getConversionsByOldAddress(oldWalletAddress) {
    return await db.select().from(conversionRequests).where((0, import_drizzle_orm2.eq)(conversionRequests.oldWalletAddress, oldWalletAddress));
  }
  async getTotalConvertedFromAddress(oldWalletAddress) {
    const requests = await db.select().from(conversionRequests).where((0, import_drizzle_orm2.eq)(conversionRequests.oldWalletAddress, oldWalletAddress));
    return requests.reduce((sum, r) => sum + parseFloat(r.amountApproved || "0"), 0);
  }
  async getLastVestingConversion(userId) {
    const [req] = await db.select().from(conversionRequests).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(conversionRequests.userId, userId), (0, import_drizzle_orm2.eq)(conversionRequests.status, "vesting"))).orderBy((0, import_drizzle_orm2.desc)(conversionRequests.createdAt)).limit(1);
    return req;
  }
  async getUserByWalletAddress(address) {
    const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.walletAddress, address));
    return user;
  }
  async getWalletAddressByAddress(address) {
    const [addr] = await db.select().from(walletAddresses).where((0, import_drizzle_orm2.eq)(walletAddresses.address, address));
    return addr;
  }
  async updateWalletAddressBalance(id, newBalance) {
    const [addr] = await db.update(walletAddresses).set({ balance: newBalance }).where((0, import_drizzle_orm2.eq)(walletAddresses.id, id)).returning();
    return addr;
  }
  async executeTransfer(senderId, receiverId, senderAddrId, receiverAddrId, amount, senderAddress, receiverAddress) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const senderResult = await client.query(
        "UPDATE users SET balance = (balance::numeric - $1::numeric) WHERE id = $2 AND balance::numeric >= $1::numeric RETURNING *",
        [amount.toFixed(4), senderId]
      );
      if (senderResult.rowCount === 0) {
        await client.query("ROLLBACK");
        throw new Error("Insufficient balance");
      }
      await client.query(
        "UPDATE users SET balance = (balance::numeric + $1::numeric) WHERE id = $2",
        [amount.toFixed(4), receiverId]
      );
      if (senderAddrId) {
        await client.query(
          "UPDATE wallet_addresses SET balance = GREATEST(0, balance::numeric - $1::numeric) WHERE id = $2",
          [amount.toFixed(4), senderAddrId]
        );
      }
      await client.query(
        "UPDATE wallet_addresses SET balance = (balance::numeric + $1::numeric) WHERE id = $2",
        [amount.toFixed(4), receiverAddrId]
      );
      const txResult = await client.query(
        `INSERT INTO transactions (sender_id, receiver_id, sender_address, receiver_address, amount, type, block_id)
         VALUES ($1, $2, $3, $4, $5, 'transfer', NULL)
         RETURNING id, sender_id AS "senderId", receiver_id AS "receiverId",
                   sender_address AS "senderAddress", receiver_address AS "receiverAddress",
                   amount, type, block_id AS "blockId", timestamp`,
        [senderId, receiverId, senderAddress, receiverAddress, amount.toFixed(4)]
      );
      await client.query("COMMIT");
      return txResult.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async updateUserStake(userId, stakedBalance, balance, lastClaim) {
    const updateData = { stakedBalance, balance };
    if (lastClaim) updateData.lastStakeRewardClaim = lastClaim;
    const [user] = await db.update(users).set(updateData).where((0, import_drizzle_orm2.eq)(users.id, userId)).returning();
    return user;
  }
  async getTotalNetworkStaked() {
    const [result] = await db.select({ total: import_drizzle_orm2.sql`COALESCE(SUM(staked_balance::numeric), 0)` }).from(users);
    return result?.total || "0";
  }
  async getTotalStakers() {
    const [result] = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(users).where(import_drizzle_orm2.sql`staked_balance::numeric > 0`);
    return Number(result?.count || 0);
  }
  async isWalletBlocked(address) {
    const [blocked] = await db.select().from(blockedWallets).where((0, import_drizzle_orm2.eq)(blockedWallets.address, address));
    return !!blocked;
  }
  async getBlockedWallets() {
    return await db.select().from(blockedWallets);
  }
  async blockWallet(address, reason) {
    const existing = await db.select().from(blockedWallets).where((0, import_drizzle_orm2.eq)(blockedWallets.address, address));
    if (existing.length > 0) return existing[0];
    const [blocked] = await db.insert(blockedWallets).values({ address, reason }).returning();
    return blocked;
  }
  async getAllConversionRequests() {
    return await db.select().from(conversionRequests).orderBy((0, import_drizzle_orm2.desc)(conversionRequests.createdAt));
  }
  async getWalletBalance(address) {
    const [addr] = await db.select().from(walletAddresses).where((0, import_drizzle_orm2.eq)(walletAddresses.address, address));
    return addr?.balance || "0";
  }
  async getWalletNonce(address) {
    const [result] = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(transactions).where((0, import_drizzle_orm2.eq)(transactions.senderAddress, address));
    return Number(result?.count || 0);
  }
  async updateWalletBalance(address, amountChange) {
    const changeStr = (Number(amountChange) / 1e6).toFixed(4);
    await db.execute(import_drizzle_orm2.sql`
      UPDATE users SET balance = (balance::numeric + ${changeStr}::numeric)::text 
      WHERE wallet_address = ${address}
    `);
    await db.execute(import_drizzle_orm2.sql`
      UPDATE wallet_addresses SET balance = (balance::numeric + ${changeStr}::numeric)::text 
      WHERE address = ${address}
    `);
  }
  async updateConversionStatus(id, status, amountApproved) {
    const updateData = { status };
    if (amountApproved !== void 0) updateData.amountApproved = amountApproved;
    const [req] = await db.update(conversionRequests).set(updateData).where((0, import_drizzle_orm2.eq)(conversionRequests.id, id)).returning();
    return req;
  }
  async getNetworkStats() {
    const [userCount] = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(users);
    const [blockCount] = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(blocks);
    const [txCount] = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(transactions);
    const blocksList = await db.select().from(blocks).orderBy((0, import_drizzle_orm2.desc)(blocks.id)).limit(1e3);
    const totalMined = blocksList.reduce((sum, b) => sum + parseFloat(b.reward || "0"), 0);
    const devAllocation = 68e8;
    const foundationAllocation = 34e8;
    const latestBlock = blocksList[0] || null;
    return {
      totalUsers: Number(userCount.count),
      totalBlocks: Number(blockCount.count),
      totalTransactions: Number(txCount.count),
      circulatingSupply: (totalMined + devAllocation + foundationAllocation).toFixed(4),
      latestBlockTime: latestBlock?.timestamp ? new Date(latestBlock.timestamp) : null
    };
  }
  async joinCardWaitlist(entry) {
    const [result] = await db.insert(cardWaitlist).values(entry).returning();
    return result;
  }
  async getCardWaitlistEntry(userId) {
    const [entry] = await db.select().from(cardWaitlist).where((0, import_drizzle_orm2.eq)(cardWaitlist.userId, userId));
    return entry;
  }
  async getCardWaitlistCount() {
    const [result] = await db.select({ count: import_drizzle_orm2.sql`count(*)` }).from(cardWaitlist);
    return Number(result.count);
  }
  async getAllCardWaitlistEntries() {
    const entries = await db.select({
      id: cardWaitlist.id,
      email: cardWaitlist.email,
      userId: cardWaitlist.userId,
      username: users.username
    }).from(cardWaitlist).leftJoin(users, (0, import_drizzle_orm2.eq)(cardWaitlist.userId, users.id)).orderBy(cardWaitlist.id);
    return entries;
  }
};
var storage = new DatabaseStorage();

// shared/routes.ts
var import_zod = require("zod");
var errorSchemas = {
  validation: import_zod.z.object({ message: import_zod.z.string(), field: import_zod.z.string().optional() }),
  notFound: import_zod.z.object({ message: import_zod.z.string() }),
  internal: import_zod.z.object({ message: import_zod.z.string() }),
  unauthorized: import_zod.z.object({ message: import_zod.z.string() })
};
var api = {
  auth: {
    register: {
      method: "POST",
      path: "/api/auth/register",
      input: insertUserSchema,
      responses: { 201: import_zod.z.custom(), 400: errorSchemas.validation }
    },
    login: {
      method: "POST",
      path: "/api/auth/login",
      input: import_zod.z.object({ username: import_zod.z.string(), password: import_zod.z.string() }),
      responses: { 200: import_zod.z.custom(), 401: errorSchemas.unauthorized }
    },
    logout: {
      method: "POST",
      path: "/api/auth/logout",
      responses: { 200: import_zod.z.object({ message: import_zod.z.string() }) }
    },
    me: {
      method: "GET",
      path: "/api/auth/me",
      responses: { 200: import_zod.z.custom(), 401: errorSchemas.unauthorized }
    },
    resetPassword: {
      method: "POST",
      path: "/api/auth/reset-password",
      input: import_zod.z.object({ username: import_zod.z.string(), seedPhrase: import_zod.z.string(), newPassword: import_zod.z.string() }),
      responses: { 200: import_zod.z.object({ message: import_zod.z.string() }), 400: errorSchemas.validation, 404: errorSchemas.notFound }
    },
    twoFactor: {
      setup: {
        method: "POST",
        path: "/api/auth/2fa/setup",
        responses: { 200: import_zod.z.object({ qrCodeUrl: import_zod.z.string(), secret: import_zod.z.string() }), 401: errorSchemas.unauthorized }
      },
      enable: {
        method: "POST",
        path: "/api/auth/2fa/enable",
        input: import_zod.z.object({ code: import_zod.z.string() }),
        responses: { 200: import_zod.z.object({ message: import_zod.z.string() }), 400: errorSchemas.validation, 401: errorSchemas.unauthorized }
      },
      disable: {
        method: "POST",
        path: "/api/auth/2fa/disable",
        input: import_zod.z.object({ code: import_zod.z.string(), password: import_zod.z.string() }),
        responses: { 200: import_zod.z.object({ message: import_zod.z.string() }), 400: errorSchemas.validation, 401: errorSchemas.unauthorized }
      },
      verify: {
        method: "POST",
        path: "/api/auth/2fa/verify",
        input: import_zod.z.object({ userId: import_zod.z.number(), code: import_zod.z.string() }),
        responses: { 200: import_zod.z.custom(), 401: errorSchemas.unauthorized }
      },
      status: {
        method: "GET",
        path: "/api/auth/2fa/status",
        responses: { 200: import_zod.z.object({ enabled: import_zod.z.boolean() }), 401: errorSchemas.unauthorized }
      }
    }
  },
  wallet: {
    get: {
      method: "GET",
      path: "/api/wallet",
      responses: { 200: import_zod.z.custom(), 401: errorSchemas.unauthorized }
    },
    transfer: {
      method: "POST",
      path: "/api/wallet/transfer",
      input: import_zod.z.object({ recipientAddress: import_zod.z.string(), amount: import_zod.z.string() }),
      responses: { 200: import_zod.z.custom(), 400: errorSchemas.validation, 401: errorSchemas.unauthorized }
    },
    addresses: {
      list: {
        method: "GET",
        path: "/api/wallet/addresses",
        responses: { 200: import_zod.z.array(import_zod.z.custom()), 401: errorSchemas.unauthorized }
      },
      create: {
        method: "POST",
        path: "/api/wallet/addresses",
        input: import_zod.z.object({ label: import_zod.z.string().optional() }),
        responses: { 201: import_zod.z.custom(), 401: errorSchemas.unauthorized }
      },
      getPhrase: {
        method: "GET",
        path: "/api/wallet/addresses/:id/phrase",
        responses: { 200: import_zod.z.object({ mnemonic: import_zod.z.string(), address: import_zod.z.string(), publicKey: import_zod.z.string() }), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound }
      },
      lock: {
        method: "PATCH",
        path: "/api/wallet/addresses/:id/lock",
        responses: { 200: import_zod.z.custom(), 401: errorSchemas.unauthorized }
      },
      unlock: {
        method: "PATCH",
        path: "/api/wallet/addresses/:id/unlock",
        responses: { 200: import_zod.z.custom(), 401: errorSchemas.unauthorized }
      },
      delete: {
        method: "DELETE",
        path: "/api/wallet/addresses/:id",
        responses: { 200: import_zod.z.object({ message: import_zod.z.string() }), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound }
      }
    }
  },
  transactions: {
    mine: {
      method: "GET",
      path: "/api/wallet/transactions",
      responses: { 200: import_zod.z.array(import_zod.z.custom()), 401: errorSchemas.unauthorized }
    }
  },
  staking: {
    info: {
      method: "GET",
      path: "/api/staking/info",
      responses: { 200: import_zod.z.object({ stakedBalance: import_zod.z.string(), pendingRewards: import_zod.z.string(), apy: import_zod.z.number(), totalNetworkStaked: import_zod.z.string(), blockHeight: import_zod.z.number(), circulatingSupply: import_zod.z.string() }), 401: errorSchemas.unauthorized }
    },
    stake: {
      method: "POST",
      path: "/api/staking/stake",
      input: import_zod.z.object({ amount: import_zod.z.string() }),
      responses: { 200: import_zod.z.object({ success: import_zod.z.boolean(), stakedBalance: import_zod.z.string(), message: import_zod.z.string() }), 400: errorSchemas.validation, 401: errorSchemas.unauthorized }
    },
    unstake: {
      method: "POST",
      path: "/api/staking/unstake",
      input: import_zod.z.object({ amount: import_zod.z.string() }),
      responses: { 200: import_zod.z.object({ success: import_zod.z.boolean(), stakedBalance: import_zod.z.string(), message: import_zod.z.string() }), 400: errorSchemas.validation, 401: errorSchemas.unauthorized }
    },
    claimRewards: {
      method: "POST",
      path: "/api/staking/claim",
      responses: { 200: import_zod.z.object({ success: import_zod.z.boolean(), reward: import_zod.z.string(), message: import_zod.z.string() }), 401: errorSchemas.unauthorized }
    },
    networkStats: {
      method: "GET",
      path: "/api/staking/network",
      responses: { 200: import_zod.z.object({ totalStaked: import_zod.z.string(), totalStakers: import_zod.z.number(), blockHeight: import_zod.z.number(), rewardRate: import_zod.z.string() }) }
    }
  },
  conversion: {
    create: {
      method: "POST",
      path: "/api/conversion",
      input: insertConversionSchema,
      responses: { 201: import_zod.z.custom(), 401: errorSchemas.unauthorized }
    },
    list: {
      method: "GET",
      path: "/api/conversion",
      responses: { 200: import_zod.z.array(import_zod.z.custom()), 401: errorSchemas.unauthorized }
    }
  },
  explorer: {
    blocks: {
      method: "GET",
      path: "/api/explorer/blocks",
      responses: { 200: import_zod.z.array(import_zod.z.custom()) }
    },
    transactions: {
      method: "GET",
      path: "/api/explorer/transactions",
      responses: { 200: import_zod.z.array(import_zod.z.custom()) }
    }
  },
  blockedWallets: {
    list: {
      method: "GET",
      path: "/api/blocked-wallets",
      responses: { 200: import_zod.z.array(import_zod.z.custom()) }
    }
  },
  admin: {
    conversions: {
      list: {
        method: "GET",
        path: "/api/admin/conversions",
        responses: { 200: import_zod.z.array(import_zod.z.custom()) }
      },
      approve: {
        method: "POST",
        path: "/api/admin/conversions/:id/approve",
        responses: { 200: import_zod.z.custom() }
      },
      reject: {
        method: "POST",
        path: "/api/admin/conversions/:id/reject",
        responses: { 200: import_zod.z.custom() }
      }
    }
  },
  alias: {
    resolve: {
      method: "GET",
      path: "/api/alias/resolve/:username",
      responses: {
        200: import_zod.z.object({ address: import_zod.z.string(), username: import_zod.z.string() }),
        404: errorSchemas.notFound
      }
    }
  }
};
var helpChatInputSchema = import_zod.z.object({
  messages: import_zod.z.array(import_zod.z.object({
    role: import_zod.z.enum(["user", "assistant"]),
    content: import_zod.z.string().max(1e3)
  })).min(1).max(10)
});

// server/routes.ts
var import_zod2 = require("zod");
var import_express_session = __toESM(require("express-session"), 1);
var import_memorystore = __toESM(require("memorystore"), 1);
var import_bcrypt = __toESM(require("bcrypt"), 1);

// server/crypto.ts
var bip39 = __toESM(require("bip39"), 1);
var secp256k1 = __toESM(require("@noble/secp256k1"), 1);
var import_crypto = require("crypto");
var import_ethers = require("ethers");
function sha256Hex(data) {
  return (0, import_crypto.createHash)("sha256").update(data).digest("hex");
}
function generateMnemonic2() {
  return bip39.generateMnemonic();
}
function mnemonicToSeed(mnemonic) {
  return bip39.mnemonicToSeedSync(mnemonic);
}
function deriveKeyPair(mnemonic) {
  const seed = mnemonicToSeed(mnemonic);
  const privateKeyHex = sha256Hex(seed.slice(0, 32));
  const privateKeyBytes = Buffer.from(privateKeyHex, "hex");
  const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, true);
  const publicKeyHex = Buffer.from(publicKeyBytes).toString("hex");
  const addressHash = sha256Hex(Buffer.from(publicKeyHex, "hex"));
  const address = "WEBD$" + addressHash.substring(0, 40).toUpperCase() + "$";
  const polygonAddress = new import_ethers.ethers.Wallet(privateKeyHex).address;
  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
    address,
    polygonAddress
  };
}
function generateWallet() {
  const mnemonic = generateMnemonic2();
  const keys = deriveKeyPair(mnemonic);
  return { mnemonic, ...keys };
}
function encryptPrivateKey(privateKey, password) {
  const key = (0, import_crypto.createHash)("sha256").update(password).digest();
  const iv = (0, import_crypto.randomBytes)(16);
  const cipher = (0, import_crypto.createCipheriv)("aes-256-cbc", key, iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// server/routes.ts
var import_crypto3 = require("crypto");
init_blockchain();
var import_drizzle_orm3 = require("drizzle-orm");
var OTPAuth = __toESM(require("otpauth"), 1);
var import_qrcode = __toESM(require("qrcode"), 1);
var import_openai = __toESM(require("openai"), 1);
var SessionStore = (0, import_memorystore.default)(import_express_session.default);
var rateLimitMap = /* @__PURE__ */ new Map();
var faucetIpStamps = /* @__PURE__ */ new Map();
function rateLimit(key, maxAttempts, windowMs) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > maxAttempts;
}
function sanitizeUsername(input) {
  return input.toLowerCase().replace(/[^a-z0-9._-]/g, "").trim();
}
async function registerRoutes(httpServer2, app2) {
  app2.set("trust proxy", 1);
  app2.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = ["https://wd2-casino.netlify.app", "https://wd2casino.netlify.app"];
    if (origin && allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
  app2.use((0, import_express_session.default)({
    secret: process.env.SESSION_SECRET || "dev_secret_webdollar2",
    resave: false,
    saveUninitialized: false,
    name: "wd2_session",
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      // 30 days persistence
      secure: "production"?.trim() === "production",
      httpOnly: true,
      sameSite: "lax"
      // Lax is more compatible for cross-domain auth transitions
    },
    store: new SessionStore({ checkPeriod: 864e5 })
  }));
  app2.post(api.auth.register.path, async (req, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown_ip";
      const isBanned = await db.execute(import_drizzle_orm3.sql`SELECT id FROM banned_ips WHERE ip = ${ip}`);
      if (isBanned.rows.length > 0) {
        return res.status(403).json({ message: "Network Access Denied: This IP Address has been permanently blacklisted for violation of Terms of Service." });
      }
      const existingIp = await db.execute(import_drizzle_orm3.sql`SELECT id FROM registration_ip_log WHERE ip = ${ip}`);
      if (existingIp.rows.length > 0 && ip !== "unknown_ip") {
        return res.status(403).json({ message: "STRICT LIMIT: Only 1 primary WebDollar 2 wallet registration is permitted per household device framework. Please use your existing account!" });
      }
      if (rateLimit(`register:${ip}`, 3, 6e4)) {
        return res.status(429).json({ message: "Rate limit triggered. Stop immediately." });
      }
      const input = api.auth.register.input.parse(req.body);
      const username = sanitizeUsername(input.username);
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters (letters, numbers, _ - .)" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (input.password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      if (input.password.length > 128) {
        return res.status(400).json({ message: "Password too long" });
      }
      const hashedPassword = await import_bcrypt.default.hash(input.password, 12);
      const wallet = generateWallet();
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        walletAddress: wallet.address,
        polygonAddress: wallet.polygonAddress,
        balance: "0",
        isDev: false,
        isFoundation: false
      });
      const encryptedKey = encryptPrivateKey(wallet.privateKey, input.password);
      await storage.createWalletAddress({
        userId: user.id,
        label: "Primary Wallet",
        address: wallet.address,
        polygonAddress: wallet.polygonAddress,
        publicKey: wallet.publicKey,
        encryptedPrivateKey: encryptedKey,
        mnemonic: wallet.mnemonic,
        isPrimary: true
      });
      if (ip !== "unknown_ip") {
        await db.execute(import_drizzle_orm3.sql`INSERT INTO registration_ip_log (ip) VALUES (${ip}) ON CONFLICT DO NOTHING`);
      }
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof import_zod2.z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post(api.auth.login.path, async (req, res, next) => {
    try {
      const ip = req.ip || "unknown";
      if (rateLimit(`login:${ip}`, 3, 3e5)) {
        return res.status(429).json({ message: "Security Warning: Too many attempts. Access blocked for 5 minutes." });
      }
      const { username: rawUsername, password } = req.body;
      if (!rawUsername || !password || typeof rawUsername !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Username and password are required" });
      }
      const username = sanitizeUsername(rawUsername);
      const user = await storage.getUserByUsername(username);
      console.log(`[LOGIN] Attempt for username: "${username}", user found: ${!!user}`);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValid = await import_bcrypt.default.compare(password, user.password);
      if (!isValid) {
        console.log(`[LOGIN] Invalid password for user: "${username}"`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      console.log(`[LOGIN] Password valid for "${username}", 2FA enabled: ${user.is2faEnabled}, has TOTP: ${!!user.totpSecret}`);
      if (user.is2faEnabled && user.totpSecret) {
        console.log(`[LOGIN] Requiring 2FA for "${username}"`);
        req.session.pending2FAUserId = user.id;
        return res.status(200).json({ requires2FA: true, userId: user.id });
      }
      req.session.userId = user.id;
      console.log(`[LOGIN] Login successful for "${username}", session userId set to ${user.id}`);
      const { password: _, totpSecret: _s, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      console.error("Login error:", err);
      next(err);
    }
  });
  app2.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });
  app2.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { password: _, totpSecret: _s, ...safeUser } = user;
    res.json(safeUser);
  });
  app2.post(api.auth.resetPassword.path, async (req, res) => {
    const ip = req.ip || "unknown";
    if (rateLimit(`reset:${ip}`, 5, 6e4)) {
      return res.status(429).json({ message: "Too many reset attempts. Try again in a minute." });
    }
    const { username: rawUsername, seedPhrase, newPassword } = req.body;
    if (!rawUsername || !seedPhrase || !newPassword || typeof rawUsername !== "string") {
      return res.status(400).json({ message: "Username, seed phrase, and new password are required" });
    }
    const username = sanitizeUsername(rawUsername);
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ message: "Password too long" });
    }
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }
    const addresses = await storage.getWalletAddresses(user.id);
    const primaryAddr = addresses.find((a) => a.isPrimary);
    if (!primaryAddr) {
      return res.status(400).json({ message: "No wallet found for this account" });
    }
    const trimmedPhrase = seedPhrase.trim().toLowerCase();
    const storedPhrase = (primaryAddr.mnemonic || "").trim().toLowerCase();
    if (trimmedPhrase !== storedPhrase) {
      return res.status(400).json({ message: "Seed phrase does not match. Please check and try again." });
    }
    const hashedPassword = await import_bcrypt.default.hash(newPassword, 12);
    await storage.updateUserPassword(user.id, hashedPassword);
    const keys = deriveKeyPair(trimmedPhrase);
    const newEncKey = encryptPrivateKey(keys.privateKey, newPassword);
    await storage.updateWalletAddress(primaryAddr.id, { encryptedPrivateKey: newEncKey });
    res.json({ message: "Password reset successfully. You can now log in with your new password." });
  });
  app2.get(api.auth.twoFactor.status.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json({ enabled: !!user.is2faEnabled });
  });
  app2.post(api.auth.twoFactor.setup.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const ip = req.ip || "unknown";
    if (rateLimit(`2fa-setup:${ip}`, 5, 6e4)) {
      return res.status(429).json({ message: "Too many requests. Try again in a minute." });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: "WebDollar2",
      label: user.username,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret
    });
    const otpauthUrl = totp.toString();
    const qrCodeUrl = await import_qrcode.default.toDataURL(otpauthUrl);
    await storage.updateUser2FA(user.id, secret.base32, false);
    res.json({ qrCodeUrl, secret: secret.base32 });
  });
  app2.post(api.auth.twoFactor.enable.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    if (!user.totpSecret) {
      return res.status(400).json({ message: "Please set up 2FA first by generating a QR code" });
    }
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Verification code is required" });
    }
    const totp = new OTPAuth.TOTP({
      issuer: "WebDollar2",
      label: user.username,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret)
    });
    const expectedToken = totp.generate();
    console.log(`[2FA Enable] User: ${user.username}, Code entered: ${code}, Expected: ${expectedToken}, Secret: ${user.totpSecret.substring(0, 4)}...`);
    const delta = totp.validate({ token: code, window: 3 });
    if (delta === null) {
      return res.status(400).json({ message: "Invalid code. Make sure the time on your phone is set to automatic, then try the latest code from your authenticator app." });
    }
    await storage.updateUser2FA(user.id, user.totpSecret, true);
    res.json({ message: "Two-factor authentication enabled successfully!" });
  });
  app2.post(api.auth.twoFactor.disable.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ message: "Verification code and password are required" });
    }
    const isValidPassword = await import_bcrypt.default.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }
    if (user.totpSecret) {
      const totp = new OTPAuth.TOTP({
        issuer: "WebDollar2",
        label: user.username,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret)
      });
      const delta = totp.validate({ token: code, window: 3 });
      if (delta === null) {
        return res.status(400).json({ message: "Invalid code. Make sure the time on your phone is set to automatic, then try the latest code from your authenticator app." });
      }
    }
    await storage.updateUser2FA(user.id, null, false);
    res.json({ message: "Two-factor authentication has been disabled." });
  });
  app2.post(api.auth.twoFactor.verify.path, async (req, res) => {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ message: "Verification code is required" });
    }
    const pendingUserId = req.session.pending2FAUserId;
    if (!pendingUserId || pendingUserId !== userId) {
      return res.status(401).json({ message: "No pending 2FA challenge. Please log in again." });
    }
    const ip = req.ip || "unknown";
    if (rateLimit(`2fa:${ip}`, 5, 6e4)) {
      return res.status(429).json({ message: "Too many verification attempts. Try again in a minute." });
    }
    if (rateLimit(`2fa:user:${userId}`, 5, 6e4)) {
      return res.status(429).json({ message: "Too many verification attempts for this account. Try again in a minute." });
    }
    const user = await storage.getUser(userId);
    if (!user || !user.totpSecret || !user.is2faEnabled) {
      return res.status(401).json({ message: "Invalid request" });
    }
    const totp = new OTPAuth.TOTP({
      issuer: "WebDollar2",
      label: user.username,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret)
    });
    const expectedToken = totp.generate();
    console.log(`[2FA Verify Login] User: ${user.username}, Code entered: ${code}, Expected: ${expectedToken}`);
    const delta = totp.validate({ token: code, window: 3 });
    if (delta === null) {
      return res.status(401).json({ message: "Invalid code. Make sure the time on your phone is set to automatic, then try the latest code from your authenticator app." });
    }
    delete req.session.pending2FAUserId;
    req.session.userId = user.id;
    const { password: _, totpSecret: _s, ...safeUser } = user;
    res.json(safeUser);
  });
  app2.get("/api/alias/resolve/:username", async (req, res) => {
    const { username } = req.params;
    let user = await storage.getUserByAlias(username);
    if (!user || !user.isAliasActive) {
      user = await storage.getUserByUsername(username);
    }
    if (!user || !user.walletAddress && (!user.isAliasActive || user.alias !== username)) {
      return res.status(404).json({ message: "Alias not found or has no primary address" });
    }
    res.json({ address: user.walletAddress, username: user.alias || user.username });
  });
  app2.post("/api/alias/update", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { alias, isAliasActive } = req.body;
    let sanitizedAlias = null;
    if (alias) {
      sanitizedAlias = sanitizeUsername(alias);
      if (sanitizedAlias === user.username.toLowerCase()) {
        return res.status(400).json({ message: "For security, your alias cannot be the same as your username." });
      }
      if (sanitizedAlias.length < 3) {
        return res.status(400).json({ message: "Alias must be at least 3 characters." });
      }
      const existing = await storage.getUserByAlias(sanitizedAlias);
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ message: "This alias is already taken by someone else." });
      }
      const existingUsername = await storage.getUserByUsername(sanitizedAlias);
      if (existingUsername && existingUsername.id !== user.id) {
        return res.status(400).json({ message: "This alias is already registered as a username." });
      }
    }
    const updated = await storage.updateUserAlias(user.id, sanitizedAlias, isAliasActive);
    const { password: _, totpSecret: _s, ...safeUser } = updated;
    res.json(safeUser);
  });
  app2.get(api.wallet.addresses.list.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const addresses = await storage.getWalletAddresses(req.session.userId);
    const safe = addresses.map((a) => ({ ...a, encryptedPrivateKey: "[ENCRYPTED]", mnemonic: "[HIDDEN]", polygonAddress: a.polygonAddress }));
    res.json(safe);
  });
  app2.post(api.wallet.addresses.create.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const label = req.body.label || "New Wallet";
    const wallet = generateWallet();
    const encryptedKey = encryptPrivateKey(wallet.privateKey, "default_enc");
    const addr = await storage.createWalletAddress({
      // @ts-ignore
      userId: req.session.userId,
      label,
      address: wallet.address,
      polygonAddress: wallet.polygonAddress,
      publicKey: wallet.publicKey,
      encryptedPrivateKey: encryptedKey,
      mnemonic: wallet.mnemonic,
      isPrimary: false
    });
    res.status(201).json({ ...addr, encryptedPrivateKey: "[ENCRYPTED]", mnemonic: "[HIDDEN]" });
  });
  app2.get("/api/wallet/addresses/:id/phrase", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const addr = await storage.getWalletAddress(Number(req.params.id));
    if (!addr || addr.userId !== req.session.userId) {
      return res.status(404).json({ message: "Address not found" });
    }
    if (addr.isLocked) {
      return res.status(400).json({ message: "Address is locked. Unlock it first." });
    }
    res.json({ mnemonic: addr.mnemonic, address: addr.address, publicKey: addr.publicKey });
  });
  app2.patch("/api/wallet/addresses/:id/lock", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const addr = await storage.getWalletAddress(Number(req.params.id));
    if (!addr || addr.userId !== req.session.userId) {
      return res.status(404).json({ message: "Address not found" });
    }
    const updated = await storage.updateWalletAddress(addr.id, { isLocked: true });
    res.json({ ...updated, encryptedPrivateKey: "[ENCRYPTED]", mnemonic: "[HIDDEN]" });
  });
  app2.patch("/api/wallet/addresses/:id/unlock", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const addr = await storage.getWalletAddress(Number(req.params.id));
    if (!addr || addr.userId !== req.session.userId) {
      return res.status(404).json({ message: "Address not found" });
    }
    const updated = await storage.updateWalletAddress(addr.id, { isLocked: false });
    res.json({ ...updated, encryptedPrivateKey: "[ENCRYPTED]", mnemonic: "[HIDDEN]" });
  });
  app2.delete("/api/wallet/addresses/:id", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const addr = await storage.getWalletAddress(Number(req.params.id));
    if (!addr || addr.userId !== req.session.userId) {
      return res.status(404).json({ message: "Address not found" });
    }
    if (addr.isPrimary) {
      return res.status(400).json({ message: "Cannot delete primary wallet address" });
    }
    if (Number(addr.balance) > 0) {
      return res.status(400).json({ message: "Cannot delete address with a positive balance. Transfer funds first." });
    }
    await storage.deleteWalletAddress(addr.id);
    res.json({ message: "Address deleted" });
  });
  app2.get(api.wallet.get.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });
  app2.post(api.wallet.transfer.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const { recipientAddress, amount } = req.body;
    if (!recipientAddress || typeof recipientAddress !== "string" || recipientAddress.trim().length < 5) {
      return res.status(400).json({ message: "Valid recipient address is required" });
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    if (amountNum > 999999999999) {
      return res.status(400).json({ message: "Amount too large" });
    }
    const sender = await storage.getUser(req.session.userId);
    if (!sender) return res.status(401).json({ message: "User not found" });
    if (sender.walletAddress === recipientAddress.trim()) {
      return res.status(400).json({ message: "Cannot transfer to yourself" });
    }
    const recipientWalletAddr = await storage.getWalletAddressByAddress(recipientAddress.trim());
    if (!recipientWalletAddr) {
      return res.status(400).json({ message: "Recipient wallet address not found on the network" });
    }
    const recipient = await storage.getUser(recipientWalletAddr.userId);
    if (!recipient) {
      return res.status(400).json({ message: "Recipient account not found" });
    }
    if (parseFloat(sender.balance) < amountNum) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    const senderWalletAddr = await storage.getWalletAddressByAddress(sender.walletAddress);
    const senderAddrId = senderWalletAddr ? senderWalletAddr.id : null;
    try {
      const tx = await storage.executeTransfer(
        sender.id,
        recipient.id,
        senderAddrId,
        recipientWalletAddr.id,
        amountNum,
        sender.walletAddress,
        recipientAddress.trim()
      );
      res.json(tx);
    } catch (err) {
      return res.status(400).json({ message: err.message || "Transfer failed" });
    }
  });
  app2.post("/api/wallet/transfer/private", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const { recipientAddress, amount } = req.body;
    if (!recipientAddress || !amount) {
      return res.status(400).json({ message: "Recipient and amount are required" });
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    const sender = await storage.getUser(req.session.userId);
    if (!sender) return res.status(401).json({ message: "User not found" });
    const recipientWalletAddr = await storage.getWalletAddressByAddress(recipientAddress.trim());
    if (!recipientWalletAddr) {
      return res.status(400).json({ message: "Recipient address not found on the network" });
    }
    const recipient = await storage.getUser(recipientWalletAddr.userId);
    if (!recipient) {
      return res.status(400).json({ message: "Recipient account not found" });
    }
    if (parseFloat(sender.balance) < amountNum) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    const senderWalletAddr = await storage.getWalletAddressByAddress(sender.walletAddress);
    const senderAddrId = senderWalletAddr ? senderWalletAddr.id : null;
    try {
      const tx = await storage.executeTransfer(
        sender.id,
        recipient.id,
        senderAddrId,
        recipientWalletAddr.id,
        amountNum,
        sender.walletAddress,
        recipientAddress.trim()
      );
      res.json({
        ...tx,
        isPrivate: true,
        senderAddress: tx.senderAddress && tx.senderAddress !== "FAUCET_TESTNET" && !tx.senderAddress.startsWith("SYSTEM_") ? tx.senderAddress.substring(0, 8) + "..." : tx.senderAddress,
        receiverAddress: tx.receiverAddress && !tx.receiverAddress.startsWith("SYSTEM_") ? tx.receiverAddress.substring(0, 8) + "..." : tx.receiverAddress
      });
    } catch (err) {
      return res.status(400).json({ message: err.message || "Private transfer failed" });
    }
  });
  app2.post("/api/wallet/testnet-faucet", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const clientIp = req.ip || req.socket?.remoteAddress || "unknown_ip";
      const isBanned = await db.execute(import_drizzle_orm3.sql`SELECT id FROM banned_ips WHERE ip = ${clientIp}`);
      if (isBanned.rows.length > 0) {
        return res.status(403).json({ message: "Access Denied: IP Blacklisted." });
      }
      const existingClaim = await db.execute(import_drizzle_orm3.sql`SELECT last_claim_at FROM faucet_claim_log WHERE ip = ${clientIp}`);
      if (existingClaim.rows.length > 0) {
        const lastClaim2 = new Date(existingClaim.rows[0].last_claim_at).getTime();
        if (Date.now() - lastClaim2 < 24 * 60 * 60 * 1e3) {
          return res.status(429).json({ message: "Network Limit: Your IP address has already claimed the Faucet today. Strict 1 claim per household router or device allows." });
        }
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      const userTxs = await storage.getUserTransactions(user.id);
      const lastClaim = userTxs.find((tx) => tx.senderAddress === "FAUCET_TESTNET");
      if (lastClaim && lastClaim.timestamp) {
        const hours24Ago = new Date(Date.now() - 24 * 60 * 60 * 1e3);
        if (new Date(lastClaim.timestamp) > hours24Ago) {
          return res.status(429).json({ message: "You can only claim the Testnet Faucet once every 24 hours!" });
        }
      }
      const addedAmount = 1e4;
      const currentBalance = parseFloat(user.balance || "0");
      const newBalance = (currentBalance + addedAmount).toFixed(4);
      if (clientIp !== "unknown_ip") {
        await db.execute(import_drizzle_orm3.sql`
            INSERT INTO faucet_claim_log (ip, wallet_address, last_claim_at) 
            VALUES (${clientIp}, ${user.walletAddress || "N/A"}, NOW())
            ON CONFLICT (ip) DO UPDATE SET last_claim_at = NOW()
          `);
      }
      const primaryAddrQuery = await storage.getWalletAddresses(user.id);
      const primaryAddr = primaryAddrQuery.find((a) => a.isPrimary);
      if (primaryAddr) {
        const addrCurrent = parseFloat(primaryAddr.balance || "0");
        const newAddrBalance = (addrCurrent + addedAmount).toFixed(4);
        await storage.updateWalletAddressBalance(primaryAddr.id, newAddrBalance);
        await storage.updateUserBalance(user.id, newAddrBalance);
      } else {
        await storage.updateUserBalance(user.id, (parseFloat(user.balance || "0") + addedAmount).toFixed(4));
      }
      await storage.createTransaction({
        senderId: null,
        receiverId: user.id,
        senderAddress: "FAUCET_TESTNET",
        receiverAddress: user.walletAddress,
        amount: addedAmount.toFixed(4),
        type: "mining_reward",
        blockId: null
      });
      faucetIpStamps.set(clientIp, Date.now());
      res.json({ success: true, amount: addedAmount });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Faucet failed" });
    }
  });
  app2.get(api.transactions.mine.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const txs = await storage.getUserTransactions(req.session.userId);
    res.json(txs);
  });
  const STAKING_REWARD_RATE = 550;
  const REWARD_INTERVAL_SECONDS = 30;
  const MIN_STAKE_AMOUNT = 1e3;
  const MIN_CLAIM_INTERVAL_MS = 3e4;
  function sha256Hex2(input) {
    return (0, import_crypto3.createHash)("sha256").update(input).digest("hex");
  }
  function calculatePendingRewards(userStaked, totalNetworkStaked, lastClaimTime) {
    if (userStaked <= 0 || totalNetworkStaked <= 0) return 0;
    const now = Date.now();
    const lastClaim = lastClaimTime ? lastClaimTime.getTime() : now;
    const elapsedSeconds = Math.max(0, (now - lastClaim) / 1e3);
    const rewardPeriods = elapsedSeconds / REWARD_INTERVAL_SECONDS;
    const userShare = userStaked / totalNetworkStaked;
    return userShare * STAKING_REWARD_RATE * rewardPeriods;
  }
  function calculateAPY(totalNetworkStaked) {
    if (totalNetworkStaked <= 0) return 0;
    const rewardsPerYear = STAKING_REWARD_RATE * (365 * 24 * 3600 / REWARD_INTERVAL_SECONDS);
    const apy = rewardsPerYear / totalNetworkStaked * 100;
    return Math.min(apy, 99999);
  }
  app2.get(api.staking.info.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const totalNetworkStaked = await storage.getTotalNetworkStaked();
    const totalStakedNum = parseFloat(totalNetworkStaked);
    const userStaked = parseFloat(user.stakedBalance || "0");
    const pendingRewards = calculatePendingRewards(userStaked, totalStakedNum, user.lastStakeRewardClaim);
    const apy = calculateAPY(totalStakedNum);
    const latestBlock = await storage.getLatestBlock();
    const blocksList = await storage.getBlocks(1e3);
    const totalMined = blocksList.reduce((sum, b) => sum + parseFloat(b.reward || "0"), 0);
    const devAllocation = 68e8;
    const foundationAllocation = 34e8;
    res.json({
      stakedBalance: userStaked.toFixed(4),
      pendingRewards: pendingRewards.toFixed(4),
      apy: Math.round(apy * 100) / 100,
      totalNetworkStaked: totalStakedNum.toFixed(4),
      blockHeight: latestBlock?.id || 0,
      circulatingSupply: (totalMined + devAllocation + foundationAllocation).toFixed(4)
    });
  });
  app2.get(api.staking.networkStats.path, async (req, res) => {
    const totalStaked = await storage.getTotalNetworkStaked();
    const totalStakers = await storage.getTotalStakers();
    const latestBlock = await storage.getLatestBlock();
    res.json({
      totalStaked,
      totalStakers,
      blockHeight: latestBlock?.id || 0,
      rewardRate: `${STAKING_REWARD_RATE} WEBD / ${REWARD_INTERVAL_SECONDS}s`
    });
  });
  app2.post(api.staking.stake.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { amount } = req.body;
    const stakeAmount = parseFloat(amount);
    if (isNaN(stakeAmount) || stakeAmount < MIN_STAKE_AMOUNT) {
      return res.status(400).json({ message: `Minimum stake amount is ${MIN_STAKE_AMOUNT} WEBD` });
    }
    const availableBalance = parseFloat(user.balance || "0");
    if (stakeAmount > availableBalance) {
      return res.status(400).json({ message: "Insufficient balance to stake" });
    }
    const totalNetworkStaked = await storage.getTotalNetworkStaked();
    const totalStakedNum = parseFloat(totalNetworkStaked);
    const currentStaked = parseFloat(user.stakedBalance || "0");
    const pendingRewards = calculatePendingRewards(currentStaked, totalStakedNum, user.lastStakeRewardClaim);
    const newBalance = (availableBalance - stakeAmount + pendingRewards).toFixed(4);
    const newStakedBalance = (currentStaked + stakeAmount).toFixed(4);
    await storage.updateUserStake(user.id, newStakedBalance, newBalance, /* @__PURE__ */ new Date());
    const minerWalletAddr = await storage.getWalletAddressByAddress(user.walletAddress);
    if (minerWalletAddr) {
      const addrBalance = parseFloat(minerWalletAddr.balance || "0");
      const newAddrBalance = Math.max(0, addrBalance - stakeAmount + pendingRewards).toFixed(4);
      await storage.updateWalletAddressBalance(minerWalletAddr.id, newAddrBalance);
    }
    if (pendingRewards > 1e-4) {
      await storage.createTransaction({
        senderId: null,
        receiverId: user.id,
        senderAddress: null,
        receiverAddress: user.walletAddress,
        amount: pendingRewards.toFixed(4),
        type: "staking_reward",
        blockId: null
      });
    }
    res.json({
      success: true,
      stakedBalance: newStakedBalance,
      message: `Successfully staked ${stakeAmount.toFixed(4)} WEBD${pendingRewards > 1e-4 ? ` and claimed ${pendingRewards.toFixed(4)} WEBD in pending rewards` : ""}`
    });
  });
  app2.post(api.staking.unstake.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { amount } = req.body;
    const unstakeAmount = parseFloat(amount);
    const currentStaked = parseFloat(user.stakedBalance || "0");
    if (isNaN(unstakeAmount) || unstakeAmount <= 0) {
      return res.status(400).json({ message: "Invalid unstake amount" });
    }
    if (unstakeAmount > currentStaked) {
      return res.status(400).json({ message: "Cannot unstake more than your staked balance" });
    }
    const totalNetworkStaked = await storage.getTotalNetworkStaked();
    const totalStakedNum = parseFloat(totalNetworkStaked);
    const pendingRewards = calculatePendingRewards(currentStaked, totalStakedNum, user.lastStakeRewardClaim);
    const availableBalance = parseFloat(user.balance || "0");
    const newBalance = (availableBalance + unstakeAmount + pendingRewards).toFixed(4);
    const newStakedBalance = (currentStaked - unstakeAmount).toFixed(4);
    await storage.updateUserStake(user.id, newStakedBalance, newBalance, /* @__PURE__ */ new Date());
    const minerWalletAddr = await storage.getWalletAddressByAddress(user.walletAddress);
    if (minerWalletAddr) {
      const addrBalance = parseFloat(minerWalletAddr.balance || "0");
      const newAddrBalance = (addrBalance + unstakeAmount + pendingRewards).toFixed(4);
      await storage.updateWalletAddressBalance(minerWalletAddr.id, newAddrBalance);
    }
    if (pendingRewards > 1e-4) {
      await storage.createTransaction({
        senderId: null,
        receiverId: user.id,
        senderAddress: null,
        receiverAddress: user.walletAddress,
        amount: pendingRewards.toFixed(4),
        type: "staking_reward",
        blockId: null
      });
    }
    res.json({
      success: true,
      stakedBalance: newStakedBalance,
      message: `Successfully unstaked ${unstakeAmount.toFixed(4)} WEBD${pendingRewards > 1e-4 ? ` and claimed ${pendingRewards.toFixed(4)} WEBD in pending rewards` : ""}`
    });
  });
  app2.post(api.staking.claimRewards.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const currentStaked = parseFloat(user.stakedBalance || "0");
    if (currentStaked <= 0) {
      return res.status(400).json({ message: "You must stake WEBD to earn rewards" });
    }
    if (user.lastStakeRewardClaim) {
      const timeSinceLastClaim = Date.now() - new Date(user.lastStakeRewardClaim).getTime();
      if (timeSinceLastClaim < MIN_CLAIM_INTERVAL_MS) {
        const waitSeconds = Math.ceil((MIN_CLAIM_INTERVAL_MS - timeSinceLastClaim) / 1e3);
        return res.status(400).json({ message: `Please wait ${waitSeconds} more seconds before claiming again` });
      }
    }
    const totalNetworkStaked = await storage.getTotalNetworkStaked();
    const totalStakedNum = parseFloat(totalNetworkStaked);
    const pendingRewards = calculatePendingRewards(currentStaked, totalStakedNum, user.lastStakeRewardClaim);
    if (pendingRewards < 1e-4) {
      return res.status(400).json({ message: "No rewards to claim yet. Keep staking!" });
    }
    const availableBalance = parseFloat(user.balance || "0");
    const newBalance = (availableBalance + pendingRewards).toFixed(4);
    await storage.updateUserStake(user.id, currentStaked.toFixed(4), newBalance, /* @__PURE__ */ new Date());
    const minerWalletAddr = await storage.getWalletAddressByAddress(user.walletAddress);
    if (minerWalletAddr) {
      const addrBalance = parseFloat(minerWalletAddr.balance || "0");
      await storage.updateWalletAddressBalance(minerWalletAddr.id, (addrBalance + pendingRewards).toFixed(4));
    }
    const latestBlock = await storage.getLatestBlock();
    const previousHash = latestBlock?.hash || "0".repeat(64);
    const blockHeight = (latestBlock?.id || 0) + 1;
    const blockData = `${previousHash}|${blockHeight}|${user.walletAddress}|${Date.now()}|stake`;
    const blockHash = sha256Hex2(blockData);
    const block = await storage.createBlock({
      hash: blockHash,
      previousHash,
      minerId: user.id,
      reward: pendingRewards.toFixed(4),
      difficulty: 1,
      nonce: 0
    });
    await storage.createTransaction({
      senderId: null,
      receiverId: user.id,
      senderAddress: null,
      receiverAddress: user.walletAddress,
      amount: pendingRewards.toFixed(4),
      type: "staking_reward",
      blockId: block.id
    });
    res.json({
      success: true,
      reward: pendingRewards.toFixed(4),
      message: `Claimed ${pendingRewards.toFixed(4)} WEBD staking rewards!`
    });
  });
  const BURN_ADDRESS = "WEBD$gDW@gHS1o$4sjBxKE7dY$fqTHwa+xj2Fjf$";
  let cachedBurnBalance = { balance: "0", lastFetched: 0 };
  const BURN_CACHE_TTL = 6e4;
  async function fetchBurnAddressBalance() {
    const now = Date.now();
    if (now - cachedBurnBalance.lastFetched < BURN_CACHE_TTL) {
      return cachedBurnBalance.balance;
    }
    try {
      const encoded = encodeURIComponent(BURN_ADDRESS).replace(/%40/g, "@").replace(/%2B/g, "+");
      const url = `https://webdollar.network/address/${encoded}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(1e4) });
      if (!response.ok) {
        console.error("Burn balance fetch failed with status:", response.status);
        return cachedBurnBalance.balance;
      }
      const html = await response.text();
      const balanceMatch = html.match(/<td>Balance<\/td>\s*<td>\s*<button[^>]*>([0-9,.]+)<\/button>/);
      if (balanceMatch) {
        const balance = balanceMatch[1].replace(/,/g, "");
        cachedBurnBalance = { balance, lastFetched: now };
        return balance;
      }
      return cachedBurnBalance.balance;
    } catch (err) {
      console.error("Failed to fetch burn address balance:", err);
      return cachedBurnBalance.balance;
    }
  }
  app2.get("/api/conversion/burn-balance", async (_req, res) => {
    const balance = await fetchBurnAddressBalance();
    res.json({
      address: BURN_ADDRESS,
      balance,
      explorerUrl: `https://webdollar.network/address/${encodeURIComponent(BURN_ADDRESS).replace(/%40/g, "@").replace(/%2B/g, "+")}`
    });
  });
  app2.post(api.conversion.create.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.conversion.create.input.parse(req.body);
      const amount = parseFloat(input.amountClaimed);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      if (amount > 42e9) {
        return res.status(400).json({ message: "Amount exceeds maximum possible legacy supply" });
      }
      const oldAddr = input.oldWalletAddress.trim();
      if (oldAddr.length < 10 || oldAddr.length > 128) {
        return res.status(400).json({ message: "Invalid legacy wallet address format" });
      }
      const isBlocked = await storage.isWalletBlocked(oldAddr);
      if (isBlocked) {
        return res.status(400).json({ message: "This wallet address has been blocked from conversion (old dev wallet)." });
      }
      const KNOWN_DEV_WALLETS = [
        "WEBD$gBzj#R3RYPqi@2xS8LHN+mKGSMaP$VXKN3$",
        "WEBD$gDZwp8rQBhKFLQCcoV4BLUJka+P&SfNn#q5n$",
        "WEBD$gAkxes3YRPNxwi0q&N1fz@GJgg&ypILn4GnZ$"
      ];
      if (KNOWN_DEV_WALLETS.includes(oldAddr)) {
        return res.status(400).json({ message: "This address belongs to a known legacy dev wallet and is blocked from conversion." });
      }
      const totalConvertedFromThisAddress = await storage.getTotalConvertedFromAddress(oldAddr);
      const previousConversions = await storage.getConversionsByOldAddress(oldAddr);
      if (previousConversions.length > 0) {
        const originalClaimed = parseFloat(previousConversions[0].amountClaimed || "0");
        const alreadyConverted = totalConvertedFromThisAddress;
        const remainingOnAddress = originalClaimed - alreadyConverted;
        if (remainingOnAddress <= 0) {
          return res.status(400).json({
            message: `This legacy address has already fully converted its ${originalClaimed.toLocaleString()} WEBD balance. No remaining funds to convert.`
          });
        }
        if (amount > remainingOnAddress) {
          return res.status(400).json({
            message: `This address originally claimed ${originalClaimed.toLocaleString()} WEBD and has already converted ${alreadyConverted.toLocaleString()} WEBD. Only ${remainingOnAddress.toLocaleString()} WEBD remains.`
          });
        }
      }
      const totalApproved = await storage.getTotalConverted(req.session.userId);
      const totalPending = await storage.getTotalPendingConversions(req.session.userId);
      const totalPreviouslyConverted = totalApproved + totalPending;
      const lifetimeCap = 5e6;
      if (totalPreviouslyConverted + amount > lifetimeCap) {
        const remaining = lifetimeCap - totalPreviouslyConverted;
        if (remaining <= 0) {
          return res.status(400).json({
            message: `You have reached the lifetime conversion cap of ${lifetimeCap.toLocaleString()} WEBD per account.`
          });
        }
        return res.status(400).json({
          message: `You can only convert up to ${remaining.toLocaleString()} more WEBD (lifetime cap: ${lifetimeCap.toLocaleString()} WEBD per account).`
        });
      }
      const reqRecord = await storage.createConversionRequest({
        oldWalletAddress: oldAddr,
        amountClaimed: input.amountClaimed,
        // @ts-ignore
        userId: req.session.userId,
        amountApproved: "0.0000",
        status: "pending",
        vestingReleaseDate: null
      });
      await storage.blockWallet(oldAddr, `Auto-blocked after conversion request #${reqRecord.id}`);
      res.status(201).json(reqRecord);
    } catch (err) {
      if (err instanceof import_zod2.z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Conversion error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get(api.conversion.list.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const list = await storage.getConversionRequests(req.session.userId);
    res.json(list);
  });
  app2.get(api.explorer.blocks.path, async (req, res) => {
    const blocksList = await storage.getBlocks();
    const enriched = await Promise.all(blocksList.map(async (block) => {
      const miner = block.minerId ? await storage.getUser(block.minerId) : null;
      return { ...block, minerAddress: miner?.walletAddress || null };
    }));
    res.json(enriched);
  });
  app2.get(api.explorer.transactions.path, async (req, res) => {
    const txs = await storage.getTransactions();
    res.json(txs);
  });
  app2.get(api.blockedWallets.list.path, async (req, res) => {
    const list = await storage.getBlockedWallets();
    res.json(list);
  });
  app2.get(api.admin.conversions.list.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user?.isDev) return res.status(403).json({ message: "Admin access required" });
    const allConversions = await storage.getAllConversionRequests();
    const enriched = await Promise.all(allConversions.map(async (conv) => {
      const convUser = conv.userId ? await storage.getUser(conv.userId) : null;
      return {
        ...conv,
        username: convUser?.username || "Unknown",
        walletAddress: convUser?.walletAddress || null
      };
    }));
    res.json(enriched);
  });
  app2.post("/api/admin/conversions/:id/approve", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });
    const convId = parseInt(req.params.id);
    if (isNaN(convId)) return res.status(400).json({ message: "Invalid conversion ID" });
    const allConversions = await storage.getAllConversionRequests();
    const conv = allConversions.find((c) => c.id === convId);
    if (!conv) return res.status(404).json({ message: "Conversion request not found" });
    if (conv.status !== "pending") return res.status(400).json({ message: "Only pending requests can be approved" });
    const customAmount = req.body.amount ? parseFloat(req.body.amount) : null;
    const approvedAmount = customAmount && !isNaN(customAmount) && customAmount > 0 ? customAmount : parseFloat(conv.amountClaimed || "0");
    if (approvedAmount <= 0) {
      return res.status(400).json({ message: "Approved amount must be greater than 0" });
    }
    const lifetimeCap = 5e6;
    if (conv.userId) {
      const totalAlreadyApproved = await storage.getTotalConverted(conv.userId);
      if (totalAlreadyApproved + approvedAmount > lifetimeCap) {
        const remaining = lifetimeCap - totalAlreadyApproved;
        return res.status(400).json({
          message: `User has already converted ${totalAlreadyApproved.toLocaleString()} WEBD. Can only approve up to ${Math.max(0, remaining).toLocaleString()} more (lifetime cap: ${lifetimeCap.toLocaleString()}).`
        });
      }
    }
    const updated = await storage.updateConversionStatus(convId, "approved", approvedAmount.toFixed(4));
    if (conv.userId) {
      const convUser = await storage.getUser(conv.userId);
      if (convUser) {
        const newBalance = (parseFloat(convUser.balance) + approvedAmount).toFixed(4);
        await storage.updateUserBalance(convUser.id, newBalance);
        await storage.createTransaction({
          senderId: null,
          receiverId: convUser.id,
          senderAddress: "LEGACY_CONVERSION",
          receiverAddress: convUser.walletAddress,
          amount: approvedAmount.toFixed(4),
          type: "conversion",
          blockId: null
        });
      }
    }
    res.json(updated);
  });
  app2.post("/api/admin/conversions/:id/reject", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });
    const convId = parseInt(req.params.id);
    if (isNaN(convId)) return res.status(400).json({ message: "Invalid conversion ID" });
    const allConversions = await storage.getAllConversionRequests();
    const conv = allConversions.find((c) => c.id === convId);
    if (!conv) return res.status(404).json({ message: "Conversion request not found" });
    if (conv.status !== "pending") return res.status(400).json({ message: "Only pending requests can be rejected" });
    const updated = await storage.updateConversionStatus(convId, "rejected", "0.0000");
    res.json(updated);
  });
  app2.get("/api/admin/card-waitlist", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });
    try {
      const entries = await storage.getAllCardWaitlistEntries();
      res.json(entries);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch waitlist" });
    }
  });
  app2.get("/api/blockchain/status", async (_req, res) => {
    try {
      const status = await checkConnection();
      const tokenAddress = getContractAddress();
      res.json({ ...status, network: "WEBD2 Testnet", tokenContract: tokenAddress });
    } catch (err) {
      res.json({ connected: false, network: "Unknown", chainId: null, blockNumber: null, tokenContract: null });
    }
  });
  app2.get("/api/blockchain/balance/:address", async (req, res) => {
    try {
      const address = req.params.address;
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: "Invalid Polygon address format" });
      }
      const tokenBalance = await getOnChainBalance(address);
      const maticBalance = await getMaticBalance(address);
      res.json({ address, tokenBalance, maticBalance });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });
  app2.get("/api/wallet/polygon-info", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const addresses = await storage.getWalletAddresses(user.id);
    const polygonAddresses = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      webdAddress: a.address,
      polygonAddress: a.polygonAddress,
      isPrimary: a.isPrimary
    }));
    let maticBalance = "0";
    if (user.polygonAddress) {
      maticBalance = await getMaticBalance(user.polygonAddress);
    }
    res.json({
      primaryPolygonAddress: user.polygonAddress,
      addresses: polygonAddresses,
      maticBalance,
      polygonscanUrl: getPolygonscanBaseUrl()
    });
  });
  app2.get("/api/blockchain/explorer/blocks", async (_req, res) => {
    try {
      const blocks3 = await getRecentBlocks(10);
      res.json({ blocks: blocks3, polygonscanUrl: getPolygonscanBaseUrl() });
    } catch {
      res.json({ blocks: [], polygonscanUrl: getPolygonscanBaseUrl() });
    }
  });
  app2.get("/api/blockchain/explorer/transactions", async (_req, res) => {
    try {
      const blocks3 = await getRecentBlocks(3);
      const allTxs = [];
      for (const block of blocks3) {
        const txs = await getRecentTransactionsFromBlock(block.number, 5);
        allTxs.push(...txs);
      }
      res.json({ transactions: allTxs.slice(0, 15), polygonscanUrl: getPolygonscanBaseUrl() });
    } catch {
      res.json({ transactions: [], polygonscanUrl: getPolygonscanBaseUrl() });
    }
  });
  app2.get("/api/card/waitlist/status", async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.json({ joined: false, position: null, totalCount: 0 });
    try {
      const entry = await storage.getCardWaitlistEntry(userId);
      const totalCount = await storage.getCardWaitlistCount();
      if (entry) {
        res.json({ joined: true, email: entry.email, position: entry.id, totalCount });
      } else {
        res.json({ joined: false, position: null, totalCount });
      }
    } catch (err) {
      res.json({ joined: false, position: null, totalCount: 0 });
    }
  });
  app2.post("/api/card/waitlist/join", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Please log in first" });
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    try {
      const userId = req.session.userId;
      const existing = await storage.getCardWaitlistEntry(userId);
      if (existing) {
        return res.status(400).json({ message: "You're already on the waitlist" });
      }
      const entry = await storage.joinCardWaitlist({ userId: req.session.userId, email: email.trim() });
      const totalCount = await storage.getCardWaitlistCount();
      res.json({ success: true, position: entry.id, totalCount });
    } catch (err) {
      console.error("Waitlist join error:", err);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });
  app2.get("/api/network/stats", async (_req, res) => {
    try {
      const stats = await storage.getNetworkStats();
      res.json(stats);
    } catch (err) {
      console.error("Network stats error:", err);
      res.json({ totalUsers: 0, totalBlocks: 0, totalTransactions: 0, circulatingSupply: "10200000000.0000", latestBlockTime: null });
    }
  });
  app2.get("/api/explorer/search", async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 3) {
      return res.status(400).json({ message: "Search query must be at least 3 characters" });
    }
    const results = { users: [], addresses: [], transactions: [], blocks: [] };
    if (q.startsWith("WEBD$")) {
      const addr = await storage.getWalletAddressByAddress(q);
      if (addr) {
        results.addresses.push({ address: addr.address, polygonAddress: addr.polygonAddress, label: addr.label, balance: addr.balance });
      }
      const user = await storage.getUserByWalletAddress(q);
      if (user) {
        results.users.push({ username: user.username, walletAddress: user.walletAddress, polygonAddress: user.polygonAddress });
      }
    }
    if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
      const txs = await storage.getTransactions(50);
      for (const tx of txs) {
        if (tx.senderAddress === q || tx.receiverAddress === q) {
          results.transactions.push(tx);
        }
      }
    }
    if (/^[a-f0-9]{64}$/.test(q)) {
      const blocksList = await storage.getBlocks(100);
      const matchedBlock = blocksList.find((b) => b.hash === q);
      if (matchedBlock) results.blocks.push(matchedBlock);
    }
    if (/^\d+$/.test(q)) {
      const blocksList = await storage.getBlocks(100);
      const matchedBlock = blocksList.find((b) => b.id === parseInt(q));
      if (matchedBlock) results.blocks.push(matchedBlock);
    }
    res.json(results);
  });
  app2.get("/api/blockchain/polygonscan-url", (_req, res) => {
    res.json({ url: getPolygonscanBaseUrl() });
  });
  app2.post("/api/admin/deploy-token", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isDev) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!deployerKey) {
      return res.status(500).json({ message: "Deployer key not configured on server" });
    }
    try {
      const { deployToken: deployToken2, setContractAddress: setAddr } = await Promise.resolve().then(() => (init_blockchain(), blockchain_exports));
      const contractAddr = await deployToken2(deployerKey);
      setAddr(contractAddr);
      res.json({ success: true, contractAddress: contractAddr });
    } catch (err) {
      console.error("Deploy error:", err);
      res.status(500).json({ message: "Deployment failed: " + (err.message || "Unknown error") });
    }
  });
  app2.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const { getStripePublishableKey: getStripePublishableKey2 } = await Promise.resolve().then(() => (init_stripeClient(), stripeClient_exports));
      const key = await getStripePublishableKey2();
      res.json({ publishableKey: key });
    } catch (err) {
      res.status(500).json({ message: "Stripe not configured" });
    }
  });
  app2.get("/api/stripe/products", async (_req, res) => {
    try {
      const result = await db.execute(
        import_drizzle_orm3.sql`SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency
        FROM stripe.products p
        JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC`
      );
      if (result.rows && result.rows.length > 0) {
        return res.json(result.rows);
      }
    } catch (err) {
      console.error("Products DB fetch error (falling back to Stripe API):", err.message);
    }
    try {
      const { getUncachableStripeClient: getUncachableStripeClient2 } = await Promise.resolve().then(() => (init_stripeClient(), stripeClient_exports));
      const stripe = await getUncachableStripeClient2();
      const prices = await stripe.prices.list({ active: true, expand: ["data.product"], limit: 20 });
      const products = prices.data.filter((p) => p.product && typeof p.product === "object" && p.product.active && p.product.metadata?.webd_amount).map((p) => ({
        product_id: p.product.id,
        product_name: p.product.name,
        product_description: p.product.description || "",
        product_metadata: p.product.metadata,
        price_id: p.id,
        unit_amount: p.unit_amount,
        currency: p.currency
      })).sort((a, b) => a.unit_amount - b.unit_amount);
      res.json(products);
    } catch (err2) {
      console.error("Products Stripe API fetch error:", err2.message);
      res.json([]);
    }
  });
  app2.post("/api/stripe/checkout", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Please log in to purchase WEBD" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ message: "Price ID required" });
    try {
      const { getUncachableStripeClient: getUncachableStripeClient2 } = await Promise.resolve().then(() => (init_stripeClient(), stripeClient_exports));
      const stripe = await getUncachableStripeClient2();
      const priceObj = await stripe.prices.retrieve(priceId, { expand: ["product"] });
      const productObj = priceObj.product;
      const webdAmount = productObj.metadata?.webd_amount || "0";
      const session2 = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/wallet?purchase=success&amount=${webdAmount}`,
        cancel_url: `${req.protocol}://${req.get("host")}/buy?purchase=cancelled`,
        metadata: {
          userId: String(user.id),
          username: user.username,
          webd_amount: webdAmount
        }
      });
      res.json({ url: session2.url });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });
  const WEBD_PRICE_USD = 963e-6;
  const MIN_CUSTOM_PURCHASE = 1e4;
  const MAX_CUSTOM_PURCHASE = 5e6;
  app2.post("/api/stripe/checkout-custom", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Please log in to purchase WEBD" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { webdAmount } = req.body;
    const amount = parseInt(webdAmount);
    if (!amount || isNaN(amount) || amount < MIN_CUSTOM_PURCHASE) {
      return res.status(400).json({ message: `Minimum purchase is ${MIN_CUSTOM_PURCHASE.toLocaleString()} WEBD per transaction` });
    }
    if (amount > MAX_CUSTOM_PURCHASE) {
      return res.status(400).json({ message: `Maximum purchase is ${MAX_CUSTOM_PURCHASE.toLocaleString()} WEBD per day per address` });
    }
    const priceInCents = Math.max(50, Math.round(amount * WEBD_PRICE_USD * 100));
    try {
      const { getUncachableStripeClient: getUncachableStripeClient2 } = await Promise.resolve().then(() => (init_stripeClient(), stripeClient_exports));
      const stripe = await getUncachableStripeClient2();
      const session2 = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `${amount.toLocaleString()} WEBD Tokens`,
              description: `Custom purchase of ${amount.toLocaleString()} WebDollar 2 tokens`,
              metadata: { webd_amount: String(amount), tier: "custom" }
            },
            unit_amount: priceInCents
          },
          quantity: 1
        }],
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/wallet?purchase=success&amount=${amount}`,
        cancel_url: `${req.protocol}://${req.get("host")}/buy?purchase=cancelled`,
        metadata: {
          userId: String(user.id),
          username: user.username,
          webd_amount: String(amount)
        }
      });
      res.json({ url: session2.url });
    } catch (err) {
      console.error("Custom checkout error:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });
  const helpOpenai = new import_openai.default({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "sk-dummy_key_to_bypass_openai_startup_crash",
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
  });
  const WEBDOLLAR_SYSTEM_PROMPT = `You are the WebDollar 2 Help Assistant. You answer questions about WDollar 2 (WEBD), a cryptocurrency platform. Be concise, friendly, and helpful. Always refer to the project as "WebDollar 2" or "WDollar 2" \u2014 never "2.0".

Key facts you know:
- WebDollar 2 is a cryptocurrency with the ticker WEBD. Price is approximately $0.00099900 per WEBD.
- Total supply: 68 billion WEBD tokens. Distribution: 85% public mining (57.8B), 10% dev allocation (6.8B), 5% foundation (3.4B).
- Mining uses Proof-of-Stake (PoS). Users stake WEBD tokens and earn passive rewards. Base rate: 550 WEBD distributed every 30 seconds among all stakers, designed for a 100-year supply duration.
- Minimum stake: 5,000 WEBD. There is a 30-second cooldown between claiming rewards. APY varies based on total network stake.
- Each wallet generates a 12-word BIP39 seed phrase, a WEBD$ address, and a Polygon-compatible 0x address from the same private key using secp256k1 cryptography.
- Users can create multiple addresses under one account from the Addresses page. Each address has its own balance and can be locked for security.
- The platform is connected to the Polygon (Amoy testnet) blockchain via Alchemy RPC. Users can view their MATIC balance and Polygonscan links.
- Legacy WEBD v1 tokens can be converted 1:1 to WDollar 2, with a lifetime cap of 5,000,000 WEBD per account, up to 1,000,000 every 6 months.
- WEBD tokens can be purchased with credit/debit card via Stripe. Available packages range from $9.99 to $299.99.
- Transfers between users are free and instant within the platform.
- The block explorer shows both internal WEBD blocks/transactions and real Polygon network data with Polygonscan links.
- Two-Factor Authentication (2FA) is available using authenticator apps like Google Authenticator or Authy.
- The crypto debit card feature allows spending WEBD at merchants (conceptual/coming soon).
- The platform is a Progressive Web App (PWA) \u2014 installable on mobile and desktop.

Navigation help:
- Home page (/) \u2014 Overview, tokenomics chart, features, roadmap
- Wallet (/wallet) \u2014 Balance, transfers, staking, mining terminal, transaction history
- Addresses (/addresses) \u2014 Create and manage multiple wallet addresses
- Buy (/buy) \u2014 Purchase WEBD tokens with card
- Explorer (/explorer) \u2014 Browse blocks and transactions, search by address or hash
- Conversion (/conversion) \u2014 Convert legacy WEBD v1 tokens
- Card (/card) \u2014 Crypto debit card info

If you don't know something, say so honestly. Do not make up information. Keep answers brief (2-4 sentences) unless the user asks for detailed explanation.`;
  app2.post("/api/help/chat", async (req, res) => {
    try {
      const parsed = helpChatInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request. Messages array is required." });
      }
      const ip = req.ip || "unknown";
      if (rateLimit(`help_chat:${ip}`, 20, 6e4)) {
        return res.status(429).json({ error: "Too many requests. Please wait a moment." });
      }
      const chatMessages = [
        { role: "system", content: WEBDOLLAR_SYSTEM_PROMPT },
        ...parsed.data.messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      ];
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const stream = await helpOpenai.chat.completions.create({
        model: "gpt-5-nano",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 1024
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}

`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}

`);
      res.end();
    } catch (error) {
      console.error("Help chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}

`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to get response" });
      }
    }
  });
  return httpServer2;
}

// server/static.ts
var import_express = __toESM(require("express"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
function serveStatic(app2) {
  const distPath = import_path.default.resolve(process.cwd(), "dist", "public");
  if (!import_fs.default.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(import_express.default.static(distPath));
  app2.use((_req, res) => {
    res.sendFile(import_path.default.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var import_http = require("http");
var import_stripe_replit_sync = require("stripe-replit-sync");
init_stripeClient();

// server/webhookHandlers.ts
init_stripeClient();
var import_drizzle_orm4 = require("drizzle-orm");
var WebhookHandlers = class _WebhookHandlers {
  static async processWebhook(payload, signature) {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. Received type: " + typeof payload + ". Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
    try {
      const event = JSON.parse(payload.toString());
      if (event.type === "checkout.session.completed") {
        await _WebhookHandlers.fulfillPurchase(event.data.object);
      }
    } catch (err) {
      console.error("Fulfillment processing error:", err.message);
    }
  }
  static async fulfillPurchase(session2) {
    const userId = parseInt(session2.metadata?.userId);
    if (!userId || isNaN(userId)) {
      console.error("Purchase fulfillment: Missing userId in session metadata");
      return;
    }
    if (session2.payment_status !== "paid") {
      console.log(`Purchase fulfillment: Payment not completed for session ${session2.id}`);
      return;
    }
    let webdAmount = 0;
    if (session2.metadata?.webd_amount) {
      webdAmount = parseInt(session2.metadata.webd_amount);
    }
    if (!webdAmount || webdAmount <= 0) {
      try {
        const stripe = await getUncachableStripeClient();
        const lineItems = await stripe.checkout.sessions.listLineItems(session2.id);
        if (lineItems.data.length > 0) {
          const priceId = lineItems.data[0].price?.id;
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
            const product = price.product;
            webdAmount = parseInt(product.metadata?.webd_amount || "0");
          }
        }
      } catch (err) {
        console.error("Purchase fulfillment: Failed to retrieve product details:", err.message);
        return;
      }
    }
    if (webdAmount <= 0) {
      console.error("Purchase fulfillment: Invalid WEBD amount from product metadata");
      return;
    }
    const sessionId = session2.id;
    try {
      await db.execute(import_drizzle_orm4.sql`BEGIN`);
      await db.execute(
        import_drizzle_orm4.sql`SELECT pg_advisory_xact_lock(hashtext(${sessionId}))`
      );
      const dupCheck = await db.execute(
        import_drizzle_orm4.sql`SELECT id FROM transactions WHERE type = 'purchase' AND sender_address = ${sessionId} LIMIT 1`
      );
      if (dupCheck.rows && dupCheck.rows.length > 0) {
        await db.execute(import_drizzle_orm4.sql`ROLLBACK`);
        console.log(`Purchase fulfillment: Session ${sessionId} already fulfilled`);
        return;
      }
      const devResult = await db.execute(
        import_drizzle_orm4.sql`UPDATE users SET balance = (balance::numeric - ${webdAmount})::text 
            WHERE username = 'WebDollarDev' AND balance::numeric >= ${webdAmount}
            RETURNING id, wallet_address, balance`
      );
      if (!devResult.rows || devResult.rows.length === 0) {
        await db.execute(import_drizzle_orm4.sql`ROLLBACK`);
        console.error("Purchase fulfillment: Dev wallet insufficient balance or not found");
        return;
      }
      const devId = devResult.rows[0].id;
      const buyerResult = await db.execute(
        import_drizzle_orm4.sql`UPDATE users SET balance = (balance::numeric + ${webdAmount})::text 
            WHERE id = ${userId}
            RETURNING id, wallet_address, balance`
      );
      if (!buyerResult.rows || buyerResult.rows.length === 0) {
        await db.execute(import_drizzle_orm4.sql`ROLLBACK`);
        console.error(`Purchase fulfillment: Buyer ${userId} not found`);
        return;
      }
      const buyerAddress = buyerResult.rows[0].wallet_address || "";
      await db.execute(
        import_drizzle_orm4.sql`UPDATE wallet_addresses SET balance = (balance::numeric + ${webdAmount})::text
            WHERE user_id = ${userId} AND is_primary = true`
      );
      await db.execute(
        import_drizzle_orm4.sql`INSERT INTO transactions (sender_id, receiver_id, sender_address, receiver_address, amount, type)
            VALUES (${devId}, ${userId}, ${sessionId}, ${buyerAddress}, ${webdAmount.toFixed(4)}, 'purchase')`
      );
      await db.execute(import_drizzle_orm4.sql`COMMIT`);
      console.log(`Purchase fulfilled: ${webdAmount.toLocaleString()} WEBD sent to user ${userId} (session: ${sessionId})`);
    } catch (err) {
      await db.execute(import_drizzle_orm4.sql`ROLLBACK`).catch(() => {
      });
      console.error("Purchase fulfillment: Transaction failed:", err.message);
    }
  }
};

// server/signaling.ts
var import_ws = require("ws");
function setupSignaling(server) {
  const peers = /* @__PURE__ */ new Map();
  let nextId = 1;
  const wss = new import_ws.WebSocketServer({ server });
  console.log("\n\u{1F7E2} DIELBS Signaling Server successfully integrated into main process");
  console.log("   Waiting for peer connections...\n");
  wss.on("connection", (ws) => {
    const peerId = `peer-${nextId++}`;
    peers.set(peerId, { ws, id: peerId, links: /* @__PURE__ */ new Set() });
    console.log(`\u2726 Peer connected: ${peerId} (${peers.size} total)`);
    const MAX_PEERS = 8;
    const existingPeerIds = Array.from(peers.keys()).filter((id) => id !== peerId);
    const shuffled = existingPeerIds.sort(() => 0.5 - Math.random());
    const selectedPeers = shuffled.slice(0, MAX_PEERS);
    selectedPeers.forEach((targetId) => {
      peers.get(peerId)?.links.add(targetId);
      peers.get(targetId)?.links.add(peerId);
      const existingPeer = peers.get(targetId);
      if (existingPeer && existingPeer.ws.readyState === import_ws.WebSocket.OPEN) {
        existingPeer.ws.send(JSON.stringify({
          type: "peer_joined",
          peerId
        }));
      }
    });
    ws.send(JSON.stringify({
      type: "welcome",
      id: peerId,
      peers: selectedPeers
    }));
    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (!data || typeof data.type !== "string") {
          console.warn(`  \u26A0 Malformed message from ${peerId}`);
          return;
        }
        switch (data.type) {
          case "broadcast":
            const payload = data.payload || data.data;
            if (!payload) {
              console.warn(`  \u26A0 Invalid broadcast from ${peerId} \u2014 missing payload`);
              return;
            }
            const myLinks = Array.from(peers.get(peerId)?.links || []);
            if (!myLinks.length) return;
            for (const targetId of myLinks) {
              const targetPeer = peers.get(targetId);
              if (targetPeer && targetPeer.ws.readyState === import_ws.WebSocket.OPEN) {
                try {
                  targetPeer.ws.send(JSON.stringify({
                    type: "relay",
                    sender: peerId,
                    payload
                  }));
                } catch (e) {
                }
              }
            }
            break;
          default:
            console.warn(`  \u26A0 Unknown message type '${data.type}' from ${peerId}`);
        }
      } catch (error) {
        console.error(`  \u2715 Error parsing message from ${peerId}:`, error);
      }
    });
    ws.on("close", () => {
      const deadPeer = peers.get(peerId);
      peers.delete(peerId);
      console.log(`\u2727 Peer disconnected: ${peerId} (${peers.size} remaining)`);
      if (deadPeer && deadPeer.links) {
        const linksArray = Array.from(deadPeer.links);
        for (const neighborId of linksArray) {
          const neighbor = peers.get(neighborId);
          if (neighbor) {
            neighbor.links.delete(peerId);
            if (neighbor.ws.readyState === import_ws.WebSocket.OPEN) {
              neighbor.ws.send(JSON.stringify({
                type: "peer_left",
                peerId
              }));
            }
          }
        }
      }
    });
    ws.on("error", (error) => {
      console.error(`  \u2715 WebSocket error for ${peerId}:`, error);
      peers.delete(peerId);
    });
  });
  setInterval(() => {
    const peersArray = Array.from(peers.entries());
    for (const [id, peer] of peersArray) {
      if (peer.ws.readyState !== import_ws.WebSocket.OPEN) {
        peers.delete(id);
        console.log(`  \u{1F504} Cleaned up stale peer: ${id}`);
      }
    }
  }, 3e4);
}

// server/index.ts
var app = (0, import_express2.default)();
var httpServer = (0, import_http.createServer)(app);
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set, skipping Stripe init");
    return;
  }
  if (!process.env.REPLIT_DOMAINS && !process.env.X_REPLIT_TOKEN && "production"?.trim() !== "production") {
    console.log("Local development environment detected: Skipping Replit-specific Stripe sync initialization.");
    return;
  }
  try {
    console.log("Initializing Stripe schema...");
    await (0, import_stripe_replit_sync.runMigrations)({ databaseUrl });
    console.log("Stripe schema ready");
    const stripeSync2 = await getStripeSync();
    const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const webhookBaseUrl = replitDomain ? `https://${replitDomain}` : "https://webdollar2.onrender.com";
    const webhookResult = await stripeSync2.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    console.log("Stripe webhook configured:", webhookResult?.webhook?.url || "OK");
    stripeSync2.syncBackfill().then(() => console.log("Stripe data synced")).catch((err) => console.error("Stripe sync error:", err));
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
  }
}
initStripe().catch((err) => console.error("Stripe init failed:", err));
app.post(
  "/api/stripe/webhook",
  import_express2.default.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).json({ error: "Missing signature" });
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body, sig);
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);
app.use(
  import_express2.default.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express2.default.urlencoded({ extended: false }));
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await registerRoutes(httpServer, app);
  app.use((err, _req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
  if ("production"?.trim() === "production") {
    serveStatic(app);
  } else {
    const { setupVite: setupVite2 } = await Promise.resolve().then(() => (init_vite(), vite_exports));
    await setupVite2(httpServer, app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  setupSignaling(httpServer);
  httpServer.on("error", (err) => {
    console.error("FATAL PORT ERROR:", err);
  });
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  log
});
