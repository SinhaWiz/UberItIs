import { useState, type ReactNode } from 'react'
import { Button } from './components/Button'
import { Card, CardRow } from './components/Card'
import { EmptyState } from './components/EmptyState'
import { Input, Select } from './components/Input'
import { Modal } from './components/Modal'
import { Skeleton, SkeletonCard } from './components/Skeleton'
import { StatusPill } from './components/StatusPill'
import { Spinner } from './components/Spinner'
import { useToast } from './components/Toast'
import type { RideStatus } from './types'

const ALL_STATUSES: RideStatus[] = [
  'REQUESTED',
  'MATCHED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * Temporary component gallery used to verify the design system renders in both
 * colour schemes. Replaced by the real router in Phase 2.
 */
export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const { notify } = useToast()

  return (
    <div className="mx-auto max-w-md px-4 py-10 flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Design system</h1>
        <p className="text-sm text-muted">
          Phase 1 foundation — tokens and base components.
        </p>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Cancel ride</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <Button fullWidth size="lg" onClick={() => notify('Ride requested')}>
          Full width, large
        </Button>
      </Section>

      <Section title="Ride status">
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((status) => (
            <StatusPill key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title="Fields">
        <Input label="Pickup" placeholder="Gulshan 1" />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          hint="Used to sign in."
        />
        <Input label="Password" type="password" error="Password is required." />
        <Select label="Role" defaultValue="RIDER">
          <option value="RIDER">Rider</option>
          <option value="DRIVER">Driver</option>
        </Select>
      </Section>

      <Section title="Card">
        <Card>
          <CardRow label="Route" value="Gulshan 1 → Banani" />
          <CardRow label="Fare" value="৳50.00" />
          <CardRow label="Driver" value="Bob Karim" />
        </Card>
      </Section>

      <Section title="Loading">
        <div className="flex items-center gap-3">
          <Spinner />
          <Skeleton className="h-4 flex-1" />
        </div>
        <SkeletonCard />
      </Section>

      <Section title="Empty state">
        <Card padded={false}>
          <EmptyState
            title="No rides yet"
            description="Your completed trips will show up here."
            action={<Button size="sm">Request a ride</Button>}
          />
        </Card>
      </Section>

      <Section title="Overlays">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button
            variant="secondary"
            onClick={() => notify('Something failed', 'error')}
          >
            Error toast
          </Button>
        </div>
      </Section>

      <Modal
        open={modalOpen}
        title="Cancel this ride?"
        description="Your driver will be released and this trip will be marked cancelled."
        confirmLabel="Cancel ride"
        cancelLabel="Keep ride"
        destructive
        onConfirm={() => {
          setModalOpen(false)
          notify('Ride cancelled')
        }}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}
