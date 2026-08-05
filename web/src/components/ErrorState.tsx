import { Button } from './Button'
import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { errorMessage } from '../lib/errors'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
}: ErrorStateProps) {
  return (
    <Card padded={false}>
      <EmptyState
        title={title}
        description={errorMessage(error)}
        action={
          onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )
        }
      />
    </Card>
  )
}
