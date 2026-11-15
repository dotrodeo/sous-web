import type { ReactNode } from 'react'
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type Announcements,
    type DragEndEvent,
    type Modifier,
    type UniqueIdentifier,
} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripIcon } from './Icons'

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

interface SortableListProps<T> {
    items: T[]
    getId: (item: T) => string
    /** Names an item in handle labels and screen-reader announcements. */
    describe: (item: T) => string
    onReorder: (next: T[]) => void
    children: ReactNode
}

/** A vertical list reordered by dragging each row's grip handle (mouse, touch
 *  or pen), or from the keyboard: focus the handle, Space to pick up, arrows to
 *  move, Space to drop, Escape to cancel. Rows are `SortableRow`s. */
export function SortableList<T>({
    items,
    getId,
    describe,
    onReorder,
    children,
}: SortableListProps<T>) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )
    const ids = items.map(getId)
    const name = (id: UniqueIdentifier) => {
        const item = items.find((it) => getId(it) === id)
        return item ? describe(item) : 'item'
    }
    const position = (id: UniqueIdentifier | undefined) =>
        id === undefined ? '' : `position ${ids.indexOf(String(id)) + 1} of ${ids.length}`

    const announcements: Announcements = {
        onDragStart: ({ active }) => `Picked up ${name(active.id)}, ${position(active.id)}.`,
        onDragOver: ({ active, over }) =>
            over ? `${name(active.id)} is now at ${position(over.id)}.` : undefined,
        onDragEnd: ({ active, over }) =>
            over
                ? `Dropped ${name(active.id)} at ${position(over.id)}.`
                : `Dropped ${name(active.id)}.`,
        onDragCancel: ({ active }) =>
            `Cancelled. ${name(active.id)} is back at ${position(active.id)}.`,
    }

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return
        onReorder(arrayMove(items, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[verticalOnly]}
            onDragEnd={onDragEnd}
            accessibility={{
                announcements,
                screenReaderInstructions: {
                    draggable:
                        'To reorder, press Space or Enter to pick up, use the arrow keys to move, then Space or Enter to drop. Press Escape to cancel.',
                },
            }}
        >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
        </DndContext>
    )
}

interface SortableRowProps {
    id: string
    label: string
    className?: string
    disabled?: boolean
    children: ReactNode
}

/** One row of a `SortableList`, with its grip handle first. */
export function SortableRow({ id, label, className, disabled, children }: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled })

    return (
        <div
            ref={setNodeRef}
            className={className}
            data-dragging={isDragging || undefined}
            style={{ transform: CSS.Translate.toString(transform), transition }}
        >
            <button
                type="button"
                className="btn-grip"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label={`reorder ${label}`}
                disabled={disabled}
            >
                <GripIcon size={20} />
            </button>
            {children}
        </div>
    )
}
