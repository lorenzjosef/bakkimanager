import { Injectable, Logger } from '@nestjs/common';
import { readOdooApiKeyFromLocalFile, resolveOdooServiceSecretSource } from './odoo-config';

interface OdooJsonRpcSuccess<T> {
  id: number;
  jsonrpc: '2.0';
  result: T;
}

interface OdooJsonRpcError {
  code: number;
  data?: {
    debug?: string;
    message?: string;
    name?: string;
  };
  message: string;
}

interface OdooJsonRpcFailure {
  error: OdooJsonRpcError;
  id: number;
  jsonrpc: '2.0';
}

type OdooJsonRpcResponse<T> = OdooJsonRpcSuccess<T> | OdooJsonRpcFailure;

type OdooKwargs = Record<string, unknown>;

@Injectable()
export class OdooService {
  private readonly logger = new Logger(OdooService.name);
  private readonly baseUrl = (
    process.env.ODOO_URL?.trim()
    || 'https://bakki.odoo.com'
  ).replace(/\/+$/, '');
  private readonly database = process.env.ODOO_DB?.trim() || 'bakki';
  private readonly username = process.env.ODOO_USERNAME?.trim()
    || process.env.ODOO_LOGIN?.trim()
    || '';
  private readonly serviceSecretSource = resolveOdooServiceSecretSource();
  private readonly serviceSecret = process.env.ODOO_PASSWORD?.trim()
    || process.env.ODOO_API_KEY?.trim()
    || readOdooApiKeyFromLocalFile();
  private readonly userAgent = 'bakki-api';
  private cachedUid: number | null = null;

  hasEndpointConfig() {
    return Boolean(this.baseUrl && this.database);
  }

  getConnectionSummary() {
    return {
      baseUrl: this.baseUrl || null,
      database: this.database || null,
      configured: this.isConfigured(),
    };
  }

  isConfigured() {
    return this.hasServiceCredentials();
  }

  async healthcheck() {
    const checkedAt = new Date().toISOString();

    if (!this.hasEndpointConfig()) {
      return {
        baseUrl: this.baseUrl || null,
        database: this.database || null,
        checkedAt,
        configured: false,
        credentialSource: this.serviceSecretSource,
        message: 'Odoo endpoint is not configured.',
        reachable: false,
      } as const;
    }

    if (!this.hasServiceCredentials()) {
      return {
        baseUrl: this.baseUrl || null,
        database: this.database || null,
        checkedAt,
        configured: false,
        credentialSource: this.serviceSecretSource,
        message: 'Odoo service credentials are not configured.',
        reachable: false,
      } as const;
    }

    try {
      await this.searchCount('res.users', [['share', '=', false]]);
      return {
        baseUrl: this.baseUrl,
        database: this.database,
        checkedAt,
        configured: true,
        credentialSource: this.serviceSecretSource,
        message:
          this.serviceSecretSource === 'api_keys_file'
            ? 'Odoo Online API is reachable. Service credentials are currently coming from API_Keys.txt fallback.'
            : 'Odoo Online API is reachable.',
        reachable: true,
      } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Odoo healthcheck error';
      this.logger.warn(`Odoo healthcheck failed: ${message}`);
      return {
        baseUrl: this.baseUrl,
        database: this.database,
        checkedAt,
        configured: true,
        credentialSource: this.serviceSecretSource,
        message,
        reachable: false,
      } as const;
    }
  }

  async authenticateUserCredentials(username: string, password: string) {
    if (!this.hasEndpointConfig()) {
      throw new Error('Odoo endpoint is not configured.');
    }

    const uid = await this.jsonRpcCall<number>('common', 'authenticate', [
      this.database,
      username,
      password,
      {},
    ]);

    return uid || null;
  }

  async searchRead<TRecord extends object>(
    model: string,
    domain: unknown[] = [],
    fields: string[] = [],
    kwargs: OdooKwargs = {},
  ) {
    return this.json2Call<TRecord[]>(model, 'search_read', {
      domain,
      fields,
      ...kwargs,
    });
  }

  async searchCount(model: string, domain: unknown[] = []) {
    return this.json2Call<number>(model, 'search_count', { domain });
  }

  async readGroup<TRecord extends object>(
    model: string,
    domain: unknown[],
    fields: string[],
    groupby: string[],
    kwargs: OdooKwargs = {},
  ) {
    return this.json2Call<TRecord[]>(model, 'read_group', {
      domain,
      fields,
      groupby,
      ...kwargs,
    });
  }

  async executeKw<TResult>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: OdooKwargs = {},
  ) {
    switch (method) {
      case 'create':
        return this.normalizeCreateResult<TResult>(
          await this.json2Call<TResult | TResult[]>(model, method, {
          vals_list: Array.isArray(args[0]) ? args[0] : [args[0]],
          ...kwargs,
          }),
          Array.isArray(args[0]),
        );
      case 'write':
        return this.json2Call<TResult>(model, method, {
          ids: Array.isArray(args[0]) ? args[0] : [],
          vals: args[1],
          ...kwargs,
        });
      case 'read':
        return this.json2Call<TResult>(model, method, {
          ids: Array.isArray(args[0]) ? args[0] : [],
          fields: Array.isArray(args[1]) ? args[1] : undefined,
          load: args[2],
          ...kwargs,
        });
      case 'search':
        return this.json2Call<TResult>(model, method, {
          domain: Array.isArray(args[0]) ? args[0] : [],
          ...kwargs,
        });
      case 'search_read':
        return this.json2Call<TResult>(model, method, {
          domain: Array.isArray(args[0]) ? args[0] : [],
          ...kwargs,
        });
      case 'search_count':
        return this.json2Call<TResult>(model, method, {
          domain: Array.isArray(args[0]) ? args[0] : [],
          ...kwargs,
        });
      default:
        return this.executeKwViaJsonRpc<TResult>(model, method, args, kwargs);
    }
  }

  private async executeKwViaJsonRpc<TResult>(
    model: string,
    method: string,
    args: unknown[],
    kwargs: OdooKwargs,
  ) {
    const uid = await this.authenticate();

    return this.jsonRpcCall<TResult>('object', 'execute_kw', [
      this.database,
      uid,
      this.serviceSecret,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  private async authenticate() {
    if (!this.hasRpcCredentials()) {
      throw new Error('Odoo RPC credentials are not configured.');
    }

    if (this.cachedUid !== null) {
      return this.cachedUid;
    }

    const uid = await this.jsonRpcCall<number>('common', 'authenticate', [
      this.database,
      this.username,
      this.serviceSecret,
      {},
    ]);

    if (!uid) {
      throw new Error('Odoo authentication failed.');
    }

    this.cachedUid = uid;
    return uid;
  }

  private async jsonRpcCall<TResult>(service: string, method: string, args: unknown[]) {
    if (!this.hasEndpointConfig()) {
      throw new Error('Odoo endpoint is not configured.');
    }

    const response = await fetch(`${this.baseUrl}/jsonrpc`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: Date.now(),
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service,
          method,
          args,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Odoo HTTP request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as OdooJsonRpcResponse<TResult>;

    if ('error' in payload) {
      const debugMessage = payload.error.data?.message ?? payload.error.data?.debug;
      this.logger.warn(`Odoo RPC ${service}.${method} failed: ${payload.error.message}`);
      throw new Error(debugMessage || payload.error.message);
    }

    return payload.result;
  }

  private async json2Call<TResult>(
    model: string,
    method: string,
    body: Record<string, unknown>,
  ) {
    if (!this.hasEndpointConfig()) {
      throw new Error('Odoo endpoint is not configured.');
    }

    if (!this.serviceSecret) {
      throw new Error('Odoo service credentials are not configured.');
    }

    const response = await fetch(`${this.baseUrl}/json/2/${model}/${method}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `bearer ${this.serviceSecret}`,
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': this.userAgent,
        'X-Odoo-Database': this.database,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = `Odoo JSON-2 request failed with status ${response.status}.`;
      try {
        const errorPayload = (await response.json()) as { message?: string };
        if (typeof errorPayload.message === 'string' && errorPayload.message.trim()) {
          errorMessage = errorPayload.message;
        }
      } catch {
        // Keep the default message if the response is not JSON.
      }
      this.logger.warn(`Odoo JSON-2 ${model}.${method} failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return (await response.json()) as TResult;
  }

  private hasRpcCredentials() {
    return Boolean(this.hasEndpointConfig() && this.username && this.serviceSecret);
  }

  private hasServiceCredentials() {
    return Boolean(this.hasEndpointConfig() && this.serviceSecret);
  }

  private normalizeCreateResult<TResult>(value: TResult | TResult[], isBatch: boolean) {
    if (!Array.isArray(value)) {
      return value as TResult;
    }

    if (isBatch) {
      return value as TResult;
    }

    return (value[0] ?? null) as TResult;
  }
}
