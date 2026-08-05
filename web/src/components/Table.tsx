import type { ReactNode } from 'react'

/**
 * Wide content must scroll inside its own container so the page body never
 * scrolls horizontally on a phone.
 */
export function Table({
  head,
  children,
}: {
  head: ReactNode
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto border border-line rounded-[var(--radius-card)] bg-elevated">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="text-left font-medium text-muted text-xs uppercase tracking-wider px-4 py-3 whitespace-nowrap">
      {children}
    </th>
  )
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 align-middle whitespace-nowrap">{children}</td>
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-line last:border-0 hover:bg-surface transition-colors duration-150">
      {children}
    </tr>
  )
}
