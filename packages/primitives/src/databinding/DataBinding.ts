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
  private _activeCallbacks = new Set<string>();  // ← Track active callbacks

  /**
   * Create a unique slot key for a node+property binding.
   * Used to track active callbacks during emission.
   */
  private _makeSlotKey(nodeId: string, property: string): string {
    return `${nodeId}::${property}`;
  }

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

    const slotKey = this._makeSlotKey(nodeId, property);

    const subscription = source.subscribe({
      next: (value: T) => {
        if (this._disposed) return;
        this._activeCallbacks.add(slotKey);
        try {
          onUpdate(nodeId, property, value);
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(
              `[DataBinding] onUpdate threw for node "${nodeId}" property "${property}":`,
              err,
            );
          }
          // Don't rethrow — protect the subscription
        } finally {
          this._activeCallbacks.delete(slotKey);
        }
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

        // Set status to 'unknown' as a safety fallback — also protected
        try {
          onUpdate(nodeId, 'status' as BindableProperty, 'unknown' as unknown as T);
        } catch {
          // Swallow — we already logged the primary error
        }
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
   * If callbacks are currently active (emitting), defers cleanup to next microtask.
   */
  unbind(nodeId: string, property?: BindableProperty): void {
    const nodeMap = this._subscriptions.get(nodeId);
    if (!nodeMap) return;

    const tryUnbind = () => {
      const nodeMapCheck = this._subscriptions.get(nodeId);
      if (!nodeMapCheck) return;

      if (property !== undefined) {
        const slotKey = this._makeSlotKey(nodeId, property);
        // If this slot is actively emitting, defer again
        if (this._activeCallbacks.has(slotKey)) {
          Promise.resolve().then(() => this.unbind(nodeId, property));
          return;
        }

        const sub = nodeMapCheck.get(property);
        if (sub) {
          sub.unsubscribe();
          nodeMapCheck.delete(property);
          this._configs.get(nodeId)?.delete(property);
        }
        if (nodeMapCheck.size === 0) {
          this._subscriptions.delete(nodeId);
          this._configs.delete(nodeId);
        }
      } else {
        // Unbind all properties for this node
        // Check if ANY are active; if so, defer entire operation
        for (const prop of nodeMapCheck.keys()) {
          const slotKey = this._makeSlotKey(nodeId, prop);
          if (this._activeCallbacks.has(slotKey)) {
            Promise.resolve().then(() => this.unbind(nodeId, property));
            return;
          }
        }

        for (const sub of nodeMapCheck.values()) {
          sub.unsubscribe();
        }
        this._subscriptions.delete(nodeId);
        this._configs.delete(nodeId);
      }
    };

    tryUnbind();
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