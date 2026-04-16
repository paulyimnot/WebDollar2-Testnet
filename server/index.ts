import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";
import { WebhookHandlers } from "./webhookHandlers.js";
import { setupSignaling } from "./signaling.js";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { clusterManager } from "./cluster.js";

// 🛡️ WAVE 1: CRITICAL STARTUP VALIDATION
if (!process.env.SESSION_SECRET) {
  console.error("❌ FATAL: SESSION_SECRET is not set. Application aborted for security.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("❌ FATAL: DATABASE_URL is not set. Database integration required.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); // Essential for accurate Render IP tracking before any limiters initialize
const httpServer = createServer(app);

// 🛡️ SECURITY SHIELD: HELMET CSP HARDENING
const externalUrl = process.env.RENDER_EXTERNAL_URL || "https://webdollar2.com";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "wss:", "ws:", externalUrl],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ⚡ SPEED COMPRESSION
app.use(compression());

// 🚫 SPAM PROTECTION (Global)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 2000, // High-performance testnet: 2000 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests from this IP. Please slow down and try again in a few minutes." }
});

// Apply stricter limits to Auth/Faucet
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 50, // Max 50 auth attempts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login/registration attempts. Please wait before trying again." }
});

const financialLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 100, // Allow 100 transfers per minute for heavy testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Security: Transfer frequency limit reached. Please wait 60 seconds." }
});

app.use("/api/auth/register", authLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/wallet/testnet-faucet", authLimiter);
app.use("/api/wallet/transfer", financialLimiter);
app.use("/api/wallet/transfer/private", financialLimiter);
app.use("/api/", globalLimiter);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set, skipping Stripe init");
    return;
  }

  // Only enable managed Stripe sync on Replit where it's a natively managed service
  const isReplit = !!(process.env.REPLIT_DOMAINS || process.env.X_REPLIT_TOKEN || process.env.REPL_ID);
  if (!isReplit) {
    console.log("Non-Replit environment detected: Skipping managed Stripe sync.");
    return;
  }

  try {
    console.log("Initializing Stripe schema...");
    await runMigrations({ databaseUrl } as any);
    console.log("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const webhookBaseUrl = isReplit ? `https://${replitDomain}` : externalUrl;
    const webhookResult = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    console.log("Stripe webhook configured:", webhookResult?.webhook?.url || "OK");

    stripeSync.syncBackfill()
      .then(() => console.log("Stripe data synced"))
      .catch((err: any) => console.error("Stripe sync error:", err));
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
  }
}

initStripe().catch(err => console.error("Stripe init failed:", err));

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).json({ error: "Missing signature" });

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // 🛡️ WAVE 1: REMOVE SENSITIVE LOGGING IN PRODUCTION
      const isProduction = process.env.NODE_ENV?.trim() === "production";
      if (!isProduction && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

  // Initialize Geo-Distributed Cluster Sync
  clusterManager.init();

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV?.trim() === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Attach unified DIELBS signaling server to the identical HTTP port
  const { storage } = await import("./storage.js");
  setupSignaling(httpServer, app, storage);
  
  httpServer.on("error", (err) => {
    console.error("FATAL PORT ERROR:", err);
  });
  
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
