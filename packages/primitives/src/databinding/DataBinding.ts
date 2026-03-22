// primitives/src/databinding/DataBinding.ts

import type { NodeStatus } from '../types';

// ── Observable types (RxJS-compatible duck typing) ──────────

export interface Subscription {
  unsubscribe(): void;
}

export interface Observable<T> {
  subscribe(observer: {
    next: (value: T) => void;
    error: (err: unknown) => void;
    complete?: () => void;
  }): Subscription;
}

// ── Binding Config ──────────────────────────────────────────

export type BindableProperty = 'status' | 'label' | 'color' | 'badges';

export interface BindingConfig<T = unknown> {
  /** Target node ID. */
  nodeId: string;
  /** Property to bind. */
  property: BindableProperty;
  /** Observable data source. */
  source: Observable<T>;
  /** Called when the source emits a new value. */
  onUpdate: (nodeId: string, property: BindableProperty, value: T) => void;
  /**
   * Called when the source errors. Defaults to logging + setting status to 'unknown'.
   * Return `true` to suppress the default error handling.
   */
  onError?: (nodeId: string, property: BindableProperty, error: unknown) => boolean | void;
}

// ── Binding Info (for debugging) ────────────────────────────

export interface BindingInfo {
  nodeId: string;
  property: BindableProperty;
}

/**
 * Manages live data bindings between Observable sources and node/edge properties.
 *
 * On each emission from a source, calls the `onUpdate` callback so the consumer
 * can apply the value to the appropriate node within the same render frame.
 *
 * On source error:
 * 1. Calls custom `onError` if provided
 * 2. Falls back to `console.error` + sets node status to `'unknown'`
 * 3. Keeps the subscription alive (does NOT unsubscribe)
 *
 * @example
 * ```ts
 * const binding = new DataBinding();
 * binding.bind({
 *   nodeId: 'api-gw',
 *   property: 'status',
 *   source: healthCheck$,
 *   onUpdate: (id, prop, value) => store.updateNode(id, { [prop]: value }),
 * });
 * ```
 */
export class DataBinding {
  /** `Map<nodeId, Map<property, Subscription>>` */
  private _subscriptions = new Map<string, Map<string, Subscription>>();
  private _configs = new Map<string, Map<string, BindingConfig>>();
  private _disposed = false;

  /**
   * Bind an observable source to a node property.
   * If a binding already exists for this `nodeId + property`, it's replaced.
   */
  bind<T>(config: BindingConfig<T>): void {
    if (this._disposed) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DataBinding] Attempted to bind after dispose(). Ignoring.');
      }
      return;
    }

    const { nodeId, property, source, onUpdate, onError } = config;

    // Remove existing binding for this slot
    this.unbind(nodeId, property);

    const subscription = source.subscribe({
      next: (value: T) => {
        if (this._disposed) return;
        onUpdate(nodeId, property, value);
      },
      error: (err: unknown) => {
        if (this._disposed) return;

        // Custom error handler
        const suppressed = onError?.(nodeId, property, err);
        if (suppressed) return;

        // Default error handling
        console.error(
          `[DataBinding] Error for node "${nodeId}" property "${property}":`,
          err,
        );

        // Set status to 'unknown' as a safety fallback
        onUpdate(nodeId, 'status' as BindableProperty, 'unknown' as unknown as T);
      },
    });

    // Store subscription
    if (!this._subscriptions.has(nodeId)) {
      this._subscriptions.set(nodeId, new Map());
    }
    this._subscriptions.get(nodeId)!.set(property, subscription);

    // Store config for debugging
    if (!this._configs.has(nodeId)) {
      this._configs.set(nodeId, new Map());
    }
    this._configs.get(nodeId)!.set(property, config as BindingConfig);
  }

  /**
   * Unbind a specific property, or all properties for a node if `property` is omitted.
   */
  unbind(nodeId: string, property?: BindableProperty): void {
    const nodeMap = this._subscriptions.get(nodeId);
    if (!nodeMap) return;

    if (property !== undefined) {
      const sub = nodeMap.get(property);
      if (sub) {
        sub.unsubscribe();
        nodeMap.delete(property);
        this._configs.get(nodeId)?.delete(property);
      }
      if (nodeMap.size === 0) {
        this._subscriptions.delete(nodeId);
        this._configs.delete(nodeId);
      }
    } else {
      // Unbind all properties for this node
      for (const sub of nodeMap.values()) {
        sub.unsubscribe();
      }
      this._subscriptions.delete(nodeId);
      this._configs.delete(nodeId);
    }
  }

  /** Check if a binding exists for a given node + property. */
  hasBinding(nodeId: string, property?: BindableProperty): boolean {
    const nodeMap = this._subscriptions.get(nodeId);
    if (!nodeMap) return false;
    if (property !== undefined) return nodeMap.has(property);
    return nodeMap.size > 0;
  }

  /** List all active bindings (for debugging). */
  getActiveBindings(): BindingInfo[] {
    const result: BindingInfo[] = [];
    for (const [nodeId, propMap] of this._subscriptions) {
      for (const property of propMap.keys()) {
        result.push({ nodeId, property: property as BindableProperty });
      }
    }
    return result;
  }

  /** Total number of active subscriptions. */
  get activeCount(): number {
    let count = 0;
    for (const propMap of this._subscriptions.values()) {
      count += propMap.size;
    }
    return count;
  }

  /** Unsubscribe all bindings and mark as disposed. */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    for (const nodeMap of this._subscriptions.values()) {
      for (const sub of nodeMap.values()) {
        sub.unsubscribe();
      }
    }
    this._subscriptions.clear();
    this._configs.clear();
  }

  /** Whether `dispose()` has been called. */
  get isDisposed(): boolean {
    return this._disposed;
  }
}