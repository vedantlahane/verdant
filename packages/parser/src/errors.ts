// parser/errors.ts — Error types and diagnostic collection

import type { VrdDiagnostic, DiagnosticSeverity } from './types';

export class VrdParserError extends Error {
  public readonly line: number;
  public readonly col?: number;

  constructor(message: string, line: number, col?: number) {
    super(`[Line ${line}${col ? `:${col}` : ''}] ${message}`);
    this.name = 'VrdParserError';
    this.line = line;
    this.col = col;
  }
}

/**
 * Accumulates diagnostics during parsing and validation.
 * Replaces the closure-captured `diag` function pattern with
 * a testable, injectable class.
 */
export class DiagnosticCollector {
  private readonly _diagnostics: VrdDiagnostic[] = [];

  add(
    line: number,
    severity: DiagnosticSeverity,
    message: string,
    col?: number,
  ): void {
    this._diagnostics.push({ line, severity, message, col });
  }

  error(line: number, message: string, col?: number): void {
    this.add(line, 'error', message, col);
  }

  warning(line: number, message: string, col?: number): void {
    this.add(line, 'warning', message, col);
  }

  info(line: number, message: string, col?: number): void {
    this.add(line, 'info', message, col);
  }

  /** All collected diagnostics (defensive copy). */
  getAll(): VrdDiagnostic[] {
    return [...this._diagnostics];
  }

  /** Only error-severity diagnostics. */
  getErrors(): VrdDiagnostic[] {
    return this._diagnostics.filter((d) => d.severity === 'error');
  }

  get hasErrors(): boolean {
    return this._diagnostics.some((d) => d.severity === 'error');
  }

  get count(): number {
    return this._diagnostics.length;
  }

  /** Merge diagnostics from another collector or array. */
  merge(source: VrdDiagnostic[] | DiagnosticCollector): void {
    const items = source instanceof DiagnosticCollector
      ? source._diagnostics
      : source;
    this._diagnostics.push(...items);
  }
}
