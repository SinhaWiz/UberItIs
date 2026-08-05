import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Input } from '../../components/Input'
import { useToast } from '../../components/Toast'
import { queryKeys } from '../../hooks/queries'
import { ApiError, api } from '../../lib/api'
import type { Ride } from '../../types'
import { usePageTitle } from '../../hooks/usePageTitle'

/**
 * Requests the ride, then immediately asks the backend to match a driver —
 * matching is a separate call, but from the rider's point of view it's one
 * action. A "no drivers" failure leaves the ride REQUESTED so it can be
 * retried from the active-ride screen.
 */
export function RequestRideForm({ riderId }: { riderId: string }) {
  usePageTitle('Request a ride')
  const queryClient = useQueryClient()
  const { notify } = useToast()

  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [error, setError] = useState<string | null>(null)

  const requestRide = useMutation({
    mutationFn: async () => {
      const ride = await api.post<Ride>('/api/rides/request', {
        riderId,
        pickupLocation: pickup.trim(),
        dropoffLocation: dropoff.trim(),
      })

      try {
        return await api.put<Ride>(`/api/rides/${ride.id}/match`, {})
      } catch {
        // Ride exists and stays REQUESTED; the next screen offers a retry.
        return ride
      }
    },
    onSuccess: (ride) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ridesByRider(riderId) })
      queryClient.setQueryData(queryKeys.ride(ride.id), ride)
      notify(
        ride.driverId ? 'Driver found. Hang tight.' : 'Ride requested.',
      )
    },
    onError: (caught) => {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not reach the server. Is the API Gateway running?',
      )
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    requestRide.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Where to?</h1>
        <p className="text-sm text-muted">
          Enter your pickup and destination to find a driver.
        </p>
      </header>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Pickup"
            required
            value={pickup}
            onChange={(event) => setPickup(event.target.value)}
            placeholder="Gulshan 1"
          />
          <Input
            label="Dropoff"
            required
            value={dropoff}
            onChange={(event) => setDropoff(event.target.value)}
            placeholder="Banani"
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={requestRide.isPending}
            disabled={!pickup.trim() || !dropoff.trim()}
          >
            Request ride
          </Button>
        </form>
      </Card>

      <p className="text-xs text-muted text-center">
        Fares are estimated at a flat rate until the payment service is live.
      </p>
    </div>
  )
}
