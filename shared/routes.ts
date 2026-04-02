import { z } from 'zod';
import { insertUserSchema, insertConversionSchema, users, conversionRequests, blocks, transactions, walletAddresses, blockedWallets } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: { 201: z.custom<typeof users.$inferSelect>(), 400: errorSchemas.validation },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: { 200: z.custom<typeof users.$inferSelect>(), 401: errorSchemas.unauthorized },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: { 200: z.object({ message: z.string() }) },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: { 200: z.custom<typeof users.$inferSelect>(), 401: errorSchemas.unauthorized },
    },
    resetPassword: {
      method: 'POST' as const,
      path: '/api/auth/reset-password' as const,
      input: z.object({ username: z.string(), seedPhrase: z.string(), newPassword: z.string() }),
      responses: { 200: z.object({ message: z.string() }), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    twoFactor: {
      setup: {
        method: 'POST' as const,
        path: '/api/auth/2fa/setup' as const,
        responses: { 200: z.object({ qrCodeUrl: z.string(), secret: z.string() }), 401: errorSchemas.unauthorized },
      },
      enable: {
        method: 'POST' as const,
        path: '/api/auth/2fa/enable' as const,
        input: z.object({ code: z.string() }),
        responses: { 200: z.object({ message: z.string() }), 400: errorSchemas.validation, 401: errorSchemas.unauthorized },
      },
      disable: {
        method: 'POST' as const,
        path: '/api/auth/2fa/disable' as const,
        input: z.object({ code: z.string(), password: z.string() }),
        responses: { 200: z.object({ message: z.string() }), 400: errorSchemas.validation, 401: errorSchemas.unauthorized },
      },
      verify: {
        method: 'POST' as const,
        path: '/api/auth/2fa/verify' as const,
        input: z.object({ userId: z.number(), code: z.string() }),
        responses: { 200: z.custom<typeof users.$inferSelect>(), 401: errorSchemas.unauthorized },
      },
      status: {
        method: 'GET' as const,
        path: '/api/auth/2fa/status' as const,
        responses: { 200: z.object({ enabled: z.boolean() }), 401: errorSchemas.unauthorized },
      },
    },
  },
  wallet: {
    get: {
      method: 'GET' as const,
      path: '/api/wallet' as const,
      responses: { 200: z.custom<typeof users.$inferSelect>(), 401: errorSchemas.unauthorized },
    },
    transfer: {
      method: 'POST' as const,
      path: '/api/wallet/transfer' as const,
      input: z.object({ recipientAddress: z.string(), amount: z.string() }),
      responses: { 200: z.custom<typeof transactions.$inferSelect>(), 400: errorSchemas.validation, 401: errorSchemas.unauthorized },
    },
    addresses: {
      list: {
        method: 'GET' as const,
        path: '/api/wallet/addresses' as const,
        responses: { 200: z.array(z.custom<typeof walletAddresses.$inferSelect>()), 401: errorSchemas.unauthorized },
      },
      create: {
        method: 'POST' as const,
        path: '/api/wallet/addresses' as const,
        input: z.object({ label: z.string().optional() }),
        responses: { 201: z.custom<typeof walletAddresses.$inferSelect>(), 401: errorSchemas.unauthorized },
      },
      getPhrase: {
        method: 'GET' as const,
        path: '/api/wallet/addresses/:id/phrase' as const,
        responses: { 200: z.object({ mnemonic: z.string(), address: z.string(), publicKey: z.string() }), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
      },
      lock: {
        method: 'PATCH' as const,
        path: '/api/wallet/addresses/:id/lock' as const,
        responses: { 200: z.custom<typeof walletAddresses.$inferSelect>(), 401: errorSchemas.unauthorized },
      },
      unlock: {
        method: 'PATCH' as const,
        path: '/api/wallet/addresses/:id/unlock' as const,
        responses: { 200: z.custom<typeof walletAddresses.$inferSelect>(), 401: errorSchemas.unauthorized },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/wallet/addresses/:id' as const,
        responses: { 200: z.object({ message: z.string() }), 401: errorSchemas.unauthorized, 404: errorSchemas.notFound },
      },
    },
  },
  transactions: {
    mine: {
      method: 'GET' as const,
      path: '/api/wallet/transactions' as const,
      responses: { 200: z.array(z.custom<typeof transactions.$inferSelect>()), 401: errorSchemas.unauthorized },
    },
  },
  staking: {
    info: {
      method: 'GET' as const,
      path: '/api/staking/info' as const,
      responses: { 200: z.object({ stakedBalance: z.string(), pendingRewards: z.string(), apy: z.number(), totalNetworkStaked: z.string(), blockHeight: z.number(), circulatingSupply: z.string() }), 401: errorSchemas.unauthorized },
    },
    stake: {
      method: 'POST' as const,
      path: '/api/staking/stake' as const,
      input: z.object({ amount: z.string() }),
      responses: { 200: z.object({ success: z.boolean(), stakedBalance: z.string(), message: z.string() }), 400: errorSchemas.validation, 401: errorSchemas.unauthorized },
    },
    unstake: {
      method: 'POST' as const,
      path: '/api/staking/unstake' as const,
      input: z.object({ amount: z.string() }),
      responses: { 200: z.object({ success: z.boolean(), stakedBalance: z.string(), message: z.string() }), 400: errorSchemas.validation, 401: errorSchemas.unauthorized },
    },
    claimRewards: {
      method: 'POST' as const,
      path: '/api/staking/claim' as const,
      responses: { 200: z.object({ success: z.boolean(), reward: z.string(), message: z.string() }), 401: errorSchemas.unauthorized },
    },
    networkStats: {
      method: 'GET' as const,
      path: '/api/staking/network' as const,
      responses: { 200: z.object({ totalStaked: z.string(), totalStakers: z.number(), blockHeight: z.number(), rewardRate: z.string() }) },
    },
  },
  conversion: {
    create: {
      method: 'POST' as const,
      path: '/api/conversion' as const,
      input: insertConversionSchema,
      responses: { 201: z.custom<typeof conversionRequests.$inferSelect>(), 401: errorSchemas.unauthorized },
    },
    list: {
      method: 'GET' as const,
      path: '/api/conversion' as const,
      responses: { 200: z.array(z.custom<typeof conversionRequests.$inferSelect>()), 401: errorSchemas.unauthorized },
    },
  },
  explorer: {
    blocks: {
      method: 'GET' as const,
      path: '/api/explorer/blocks' as const,
      responses: { 200: z.array(z.custom<typeof blocks.$inferSelect>()) },
    },
    transactions: {
      method: 'GET' as const,
      path: '/api/explorer/transactions' as const,
      responses: { 200: z.array(z.custom<typeof transactions.$inferSelect>()) },
    },
  },
  blockedWallets: {
    list: {
      method: 'GET' as const,
      path: '/api/blocked-wallets' as const,
      responses: { 200: z.array(z.custom<typeof blockedWallets.$inferSelect>()) },
    },
  },
  admin: {
    conversions: {
      list: {
        method: 'GET' as const,
        path: '/api/admin/conversions' as const,
        responses: { 200: z.array(z.custom<typeof conversionRequests.$inferSelect>()) },
      },
      approve: {
        method: 'POST' as const,
        path: '/api/admin/conversions/:id/approve' as const,
        responses: { 200: z.custom<typeof conversionRequests.$inferSelect>() },
      },
      reject: {
        method: 'POST' as const,
        path: '/api/admin/conversions/:id/reject' as const,
        responses: { 200: z.custom<typeof conversionRequests.$inferSelect>() },
      },
    },
  },
  alias: {
    resolve: {
      method: 'GET' as const,
      path: '/api/alias/resolve/:username' as const,
      responses: { 
        200: z.object({ address: z.string(), username: z.string() }), 
        404: errorSchemas.notFound 
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export const helpChatInputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(1000),
  })).min(1).max(10),
});

export type LoginRequest = { username: string; password: string };
export type RegisterRequest = { username: string; password: string };
export type InsertConversionRequest = z.infer<typeof insertConversionSchema>;
