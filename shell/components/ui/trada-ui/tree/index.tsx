"use client"

import { ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { createContext, type HTMLAttributes, type ReactNode, useCallback, useContext, useId, useState } from "react"
import { cn } from "@/lib/utils"

type TreeContextType = {
  expandedIds: Set<string>
  selectedIds: string[]
  toggleExpanded: (nodeId: string) => void
  handleSelection: (nodeId: string, ctrlKey: boolean) => void
  showLines?: boolean
  showIcons?: boolean
  selectable?: boolean
  multiSelect?: boolean
  indent?: number
  animateExpand?: boolean
}

const TreeContext = createContext<TreeContextType | undefined>(undefined)

const useTree = () => {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error("Tree components must be used within a TreeProvider")
  }
  return context
}

type TreeNodeContextType = {
  nodeId: string
  level: number
  isLast: boolean
  parentPath: boolean[]
}

const TreeNodeContext = createContext<TreeNodeContextType | undefined>(undefined)

const useTreeNode = () => {
  const context = useContext(TreeNodeContext)
  if (!context) {
    throw new Error("TreeNode components must be used within a TreeNode")
  }
  return context
}

export type TreeProviderProps = {
  children: ReactNode
  defaultExpandedIds?: string[]
  showLines?: boolean
  showIcons?: boolean
  selectable?: boolean
  multiSelect?: boolean
  selectedIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  indent?: number
  animateExpand?: boolean
  className?: string
}

export const TreeProvider = ({
  children,
  defaultExpandedIds = [],
  showLines = true,
  showIcons = true,
  selectable = true,
  multiSelect = false,
  selectedIds,
  onSelectionChange,
  indent = 20,
  animateExpand = true,
  className,
}: TreeProviderProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultExpandedIds))
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds ?? [])

  const isControlled = selectedIds !== undefined && onSelectionChange !== undefined
  const currentSelectedIds = isControlled ? selectedIds : internalSelectedIds

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  const handleSelection = useCallback(
    (nodeId: string, ctrlKey = false) => {
      if (!selectable) {
        return
      }

      let newSelection: string[]

      if (multiSelect && ctrlKey) {
        newSelection = currentSelectedIds.includes(nodeId) ? currentSelectedIds.filter(id => id !== nodeId) : [...currentSelectedIds, nodeId]
      } else {
        newSelection = currentSelectedIds.includes(nodeId) ? [] : [nodeId]
      }

      if (isControlled) {
        onSelectionChange?.(newSelection)
      } else {
        setInternalSelectedIds(newSelection)
      }
    },
    [selectable, multiSelect, currentSelectedIds, isControlled, onSelectionChange]
  )

  return (
    <TreeContext.Provider
      value={{
        expandedIds,
        selectedIds: currentSelectedIds,
        toggleExpanded,
        handleSelection,
        showLines,
        showIcons,
        selectable,
        multiSelect,
        indent,
        animateExpand,
      }}
    >
      <div className={cn("w-full", className)}>{children}</div>
    </TreeContext.Provider>
  )
}

export type TreeViewProps = HTMLAttributes<HTMLDivElement>

export const TreeView = ({ className, children, ...props }: TreeViewProps) => (
  <div className={cn("p-2", className)} {...props}>
    {children}
  </div>
)

export type TreeNodeProps = HTMLAttributes<HTMLDivElement> & {
  nodeId?: string
  level?: number
  isLast?: boolean
  parentPath?: boolean[]
  children?: ReactNode
}

export const TreeNode = ({ nodeId: providedNodeId, level = 0, isLast = false, parentPath = [], children, className, onClick, ...props }: TreeNodeProps) => {
  const generatedId = useId()
  const nodeId = providedNodeId ?? generatedId

  // Build the parent path - mark positions where the parent was the last child
  const currentPath = level === 0 ? [] : [...parentPath]
  if (level > 0 && parentPath.length < level - 1) {
    // Fill in missing levels with false (not last)
    while (currentPath.length < level - 1) {
      currentPath.push(false)
    }
  }
  if (level > 0) {
    currentPath[level - 1] = isLast
  }

  return (
    <TreeNodeContext.Provider
      value={{
        nodeId,
        level,
        isLast,
        parentPath: currentPath,
      }}
    >
      <div className={cn("select-none", className)} {...props}>
        {children}
      </div>
    </TreeNodeContext.Provider>
  )
}

export type TreeNodeTriggerProps = HTMLAttributes<HTMLDivElement>

export const TreeNodeTrigger = ({ children, className, onClick, ...props }: TreeNodeTriggerProps) => {
  const { selectedIds, handleSelection, toggleExpanded, indent } = useTree()
  const { nodeId, level } = useTreeNode()
  const isSelected = selectedIds.includes(nodeId)

  return (
    <div
      className={cn(
        "group relative mx-1 flex cursor-pointer items-center rounded-md px-3 py-2 transition-all duration-200",
        "hover:bg-accent/50",
        isSelected && "bg-accent/80",
        className
      )}
      style={{ paddingLeft: level * (indent ?? 0) + 8 }}
      onClick={e => {
        handleSelection(nodeId, e.ctrlKey || e.metaKey)
        onClick?.(e)
      }}
      onDoubleClick={e => {
        if (e.ctrlKey || e.metaKey) return
        toggleExpanded(nodeId)
      }}
      {...props}
    >
      <TreeLines />
      {children as ReactNode}
    </div>
  )
}

export const TreeLines = () => {
  const { showLines, indent } = useTree()
  const { level, isLast, parentPath } = useTreeNode()

  if (!showLines || level === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute top-0 bottom-0 left-0">
      {/* Render vertical lines for all parent levels */}
      {Array.from({ length: level }, (_, index) => {
        const shouldHideLine = parentPath[index] === true
        if (shouldHideLine && index === level - 1) {
          return null
        }

        return (
          <div
            className="absolute top-0 bottom-0 border-border/40 border-l"
            key={index.toString()}
            style={{
              left: index * (indent ?? 0) + 12,
              display: shouldHideLine ? "none" : "block",
            }}
          />
        )
      })}

      {/* Horizontal connector line */}
      <div
        className="absolute top-1/2 border-border/40 border-t"
        style={{
          left: (level - 1) * (indent ?? 0) + 12,
          width: (indent ?? 0) - 4,
          transform: "translateY(-1px)",
        }}
      />

      {/* Vertical line to midpoint for last items */}
      {isLast && (
        <div
          className="absolute top-0 border-border/40 border-l"
          style={{
            left: (level - 1) * (indent ?? 0) + 12,
            height: "50%",
          }}
        />
      )}
    </div>
  )
}

export type TreeNodeContentProps = HTMLAttributes<HTMLDivElement> & {
  hasChildren?: boolean
}

export const TreeNodeContent = ({ children, hasChildren = false, className, ...props }: TreeNodeContentProps) => {
  const { expandedIds } = useTree()
  const { nodeId } = useTreeNode()
  const isExpanded = expandedIds.has(nodeId)

  if (!hasChildren || !isExpanded) {
    return null
  }

  return (
    <div className={className} {...props}>
      {children as ReactNode}
    </div>
  )
}

export type TreeExpanderProps = HTMLAttributes<HTMLDivElement> & {
  hasChildren?: boolean
}

export const TreeExpander = ({ hasChildren = false, className, onClick, ...props }: TreeExpanderProps) => {
  const { expandedIds, toggleExpanded } = useTree()
  const { nodeId } = useTreeNode()
  const isExpanded = expandedIds.has(nodeId)

  if (!hasChildren) {
    return <div className="mr-1 h-4 w-4" />
  }

  return (
    <div
      className={cn("mr-1 flex h-4 w-4 items-center justify-center transition-transform duration-150", isExpanded && "rotate-90", className)}
      onClick={e => {
        e.stopPropagation()
        toggleExpanded(nodeId)
        onClick?.(e)
      }}
      {...props}
    >
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
    </div>
  )
}

export type TreeIconProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode
  hasChildren?: boolean
}

export const TreeIcon = ({ icon, hasChildren = false, className, ...props }: TreeIconProps) => {
  const { showIcons, expandedIds } = useTree()
  const { nodeId } = useTreeNode()
  const isExpanded = expandedIds.has(nodeId)

  if (!showIcons) {
    return null
  }

  const getDefaultIcon = () => (hasChildren ? isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />)

  return (
    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center text-muted-foreground transition-transform", className)} {...props}>
      {icon || getDefaultIcon()}
    </div>
  )
}

export type TreeLabelProps = HTMLAttributes<HTMLSpanElement>

export const TreeLabel = ({ className, ...props }: TreeLabelProps) => <span className={cn("font flex-1 truncate text-sm", className)} {...props} />
