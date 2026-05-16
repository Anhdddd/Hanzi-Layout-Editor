/**
 * UndoRedo — simple undo/redo stack for element state.
 */
import type { AnyElementProps } from '../types.ts';

export class UndoRedo {
  private history: AnyElementProps[][] = [];
  private pointer = -1;
  private readonly maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  /** Push a snapshot of the current state. */
  push(state: AnyElementProps[]): void {
    const snapshot: AnyElementProps[] = JSON.parse(JSON.stringify(state));

    if (this.pointer < this.history.length - 1) {
      this.history = this.history.slice(0, this.pointer + 1);
    }

    this.history.push(snapshot);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.pointer = this.history.length - 1;
  }

  undo(): AnyElementProps[] | null {
    if (this.pointer <= 0) return null;
    this.pointer--;
    return JSON.parse(JSON.stringify(this.history[this.pointer]));
  }

  redo(): AnyElementProps[] | null {
    if (this.pointer >= this.history.length - 1) return null;
    this.pointer++;
    return JSON.parse(JSON.stringify(this.history[this.pointer]));
  }

  canUndo(): boolean { return this.pointer > 0; }
  canRedo(): boolean { return this.pointer < this.history.length - 1; }

  clear(): void {
    this.history = [];
    this.pointer = -1;
  }
}
