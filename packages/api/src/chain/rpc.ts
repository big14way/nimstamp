import type { Env } from '../env';

export interface RpcTx {
  hash: string;
  blockNumber: number | null;
  timestamp: number; // ms
  confirmations?: number;
  from: string;
  to: string;
  value: number; // luna
  fee: number;
  senderData: string;
  recipientData: string; // hex
  executionResult?: boolean;
}

export class RpcError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'timeout' | 'rpc' = 'rpc',
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 8000;

export class RpcClient {
  constructor(
    private readonly url: string,
    private readonly auth?: string,
  ) {}

  static fromEnv(env: Env) {
    return new RpcClient(env.NIMIQ_RPC_URL, env.NIMIQ_RPC_AUTH || undefined);
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (this.auth) headers.authorization = this.auth.startsWith('Basic ') || this.auth.startsWith('Bearer ') ? this.auth : `Bearer ${this.auth}`;
      res = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: ctrl.signal,
      });
    } catch (e) {
      throw new RpcError(`rpc ${method}: ${(e as Error).name === 'AbortError' ? 'timeout' : 'network error'}`, (e as Error).name === 'AbortError' ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new RpcError(`rpc ${method}: http ${res.status}`, 'network');
    const json = (await res.json()) as { result?: { data?: T } | T; error?: { code: number; message: string; data?: string } };
    if (json.error) throw new RpcError(json.error.data || json.error.message || 'rpc error', 'rpc');
    const r = json.result as { data?: T } | T;
    if (r && typeof r === 'object' && 'data' in (r as object)) return (r as { data: T }).data;
    return r as T;
  }

  getBlockNumber() {
    return this.call<number>('getBlockNumber');
  }

  /** Albatross requires 3 positional params: address, max, startAt (null = newest). */
  getTransactionsByAddress(address: string, max = 100) {
    return this.call<RpcTx[]>('getTransactionsByAddress', [address, max, null]);
  }

  /** Returns null when the node does not know the hash (yet). */
  async getTransactionByHash(hash: string): Promise<RpcTx | null> {
    try {
      return await this.call<RpcTx>('getTransactionByHash', [hash]);
    } catch (e) {
      if (e instanceof RpcError && e.kind === 'rpc' && /not found/i.test(e.message)) return null;
      throw e;
    }
  }
}
