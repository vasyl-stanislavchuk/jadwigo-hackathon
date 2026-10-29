/**
 * dnd-kit's own announcements are English only: a drag part announces in the lesson's language
 * through its live region instead, so dnd-kit's are silenced. The drag parts (DropZones, TileBank,
 * SortableList) pass this as DndContext's `accessibility`. No @dnd-kit import here, not even a type:
 * dependency-cruiser's drag-only-in-the-drag-parts rule counts type imports, and this file is not
 * one of the three.
 */
export const QUIET = {
  announcements: {
    onDragStart: () => undefined,
    onDragOver: () => undefined,
    onDragEnd: () => undefined,
    onDragCancel: () => undefined,
  },
  screenReaderInstructions: { draggable: "" },
};
