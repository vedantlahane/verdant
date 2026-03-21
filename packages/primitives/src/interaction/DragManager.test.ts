import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { DragManager } from './DragManager';
import { SelectionManager } from './SelectionManager';
import { CommandHistory } from './CommandHistory';

function makeSetup() {
  const selectionManager = new SelectionManager();
  const commandHistory = new CommandHistory();
  const nodePositions = new Map<string, THREE.Vector3>([
    ['a', new THREE.Vector3(0, 0, 0)],
    ['b', new THREE.Vector3(5, 0, 0)],
    ['c', new THREE.Vector3(10, 0, 0)],
  ]);
  const dragManager = new DragManager(selectionManager, commandHistory, nodePositions);
  return { selectionManager, commandHistory, nodePositions, dragManager };
}

describe('DragManager', () => {
  describe('isDragging', () => {
    it('is false initially', () => {
      const { dragManager } = makeSetup();
      expect(dragManager.isDragging).toBe(false);
    });

    it('is true after startDrag', () => {
      const { dragManager } = makeSetup();
      dragManager.startDrag(new THREE.Vector3(0, 0, 0));
      expect(dragManager.isDragging).toBe(true);
    });

    it('is false after endDrag', () => {
      const { dragManager } = makeSetup();
      dragManager.startDrag(new THREE.Vector3(0, 0, 0));
      dragManager.endDrag();
      expect(dragManager.isDragging).toBe(false);
    });
  });

  describe('startDrag', () => {
    it('snapshots positions of all selected nodes', () => {
      const { selectionManager, nodePositions, dragManager } = makeSetup();
      selectionManager.select('a');
      selectionManager.select('b', true);

      // Move nodes before drag starts to verify snapshot captures current state
      nodePositions.get('a')!.set(1, 2, 3);
      nodePositions.get('b')!.set(4, 5, 6);

      dragManager.startDrag(new THREE.Vector3(0, 0, 0));

      // Move nodes after snapshot — moveDrag should use snapshot, not current
      nodePositions.get('a')!.set(99, 99, 99);
      nodePositions.get('b')!.set(99, 99, 99);

      // moveDrag with zero delta should restore to snapshot values
      dragManager.moveDrag(new THREE.Vector3(0, 0, 0));

      expect(nodePositions.get('a')!.toArray()).toEqual([1, 2, 3]);
      expect(nodePositions.get('b')!.toArray()).toEqual([4, 5, 6]);
    });

    it('only snapshots selected nodes, not unselected ones', () => {
      const { selectionManager, nodePositions, dragManager } = makeSetup();
      selectionManager.select('a');

      dragManager.startDrag(new THREE.Vector3(0, 0, 0));
      dragManager.moveDrag(new THREE.Vector3(3, 0, 0));

      // 'c' was not selected, should remain unchanged
      expect(nodePositions.get('c')!.toArray()).toEqual([10, 0, 0]);
    });
  });

  describe('moveDrag', () => {
    it('translates all selected nodes by the same delta', () => {
      const { selectionManager, nodePositions, dragManager } = makeSetup();
      selectionManager.select('a');
      selectionManager.select('b', true);

      dragManager.startDrag(new THREE.Vector3(0, 0, 0));
      dragManager.moveDrag(new THREE.Vector3(3, 2, 1));

      expect(nodePositions.get('a')!.toArray()).toEqual([3, 2, 1]);
      expect(nodePositions.get('b')!.toArray()).toEqual([8, 2, 1]);
    });

    it('updates positions on subsequent moveDrag calls', () => {
      const { selectionManager, nodePositions, dragManager } = makeSetup();
      selectionManager.select('a');

      dragManager.startDrag(new THREE.Vector3(0, 0, 0));
      dragManager.moveDrag(new THREE.Vector3(1, 0, 0));
      dragManager.moveDrag(new THREE.Vector3(5, 0, 0));

      expect(nodePositions.get('a')!.toArray()).toEqual([5, 0, 0]);
    });

    it('does nothing if not dragging', () => {
      const { nodePositions, dragManager } = makeSetup();
      dragManager.moveDrag(new THREE.Vector3(10, 10, 10));
      expect(nodePositions.get('a')!.toArray()).toEqual([0, 0, 0]);
    });
  });

  describe('endDrag', () => {
    it('pushes a MoveCommand to CommandHistory', () => {
      const { selectionManager, commandHistory, dragManager } = makeSetup();
      selectionManager.select('a');

      dragManager.startDrag(new THREE.Vector3(0, 0, 0));
      dragManager.moveDrag(new THREE.Vector3(3, 0, 0));
      dragManager.endDrag();

      expect(commandHistory.canUndo).toBe(true);
    });

    it('does nothing if not dragging', () => {
      const { commandHistory, dragManager } = makeSetup();
      dragManager.endDrag();
      expect(commandHistory.canUndo).toBe(false);
    });
  });

  describe('undo', () => {
    it('restores nodes to their pre-drag positions after undo', () => {
      const { selectionManager, commandHistory, nodePositions, dragManager } = makeSetup();
      selectionManager.select('a');
      selectionManager.select('b', true);

      dragManager.startDrag(new THREE.Vector3(0, 0, 0));
      dragManager.moveDrag(new THREE.Vector3(10, 5, 0));
      dragManager.endDrag();

      // Positions should be updated
      expect(nodePositions.get('a')!.toArray()).toEqual([10, 5, 0]);
      expect(nodePositions.get('b')!.toArray()).toEqual([15, 5, 0]);

      commandHistory.undo();

      // Positions should be restored
      expect(nodePositions.get('a')!.toArray()).toEqual([0, 0, 0]);
      expect(nodePositions.get('b')!.toArray()).toEqual([5, 0, 0]);
    });

    it('redo re-applies the move after undo', () => {
      const { selectionManager, commandHistory, nodePositions, dragManager } = makeSetup();
      selectionManager.select('a');

      dragManager.startDrag(new THREE.Vector3(0, 0, 0));
      dragManager.moveDrag(new THREE.Vector3(7, 0, 0));
      dragManager.endDrag();

      commandHistory.undo();
      expect(nodePositions.get('a')!.toArray()).toEqual([0, 0, 0]);

      commandHistory.redo();
      expect(nodePositions.get('a')!.toArray()).toEqual([7, 0, 0]);
    });
  });
});
