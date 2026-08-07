import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { useToast } from '../../components/Toast'
import { queryKeys } from '../../hooks/queries'
import { ApiError, api } from '../../lib/api'
import type { Ride } from '../../types'
import { usePageTitle } from '../../hooks/usePageTitle'
import { LocationPicker } from '../../components/LocationPicker'

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

  const [activeTab, setActiveTab] = useState<'pickup' | 'dropoff'>('pickup')

  // Map temporary state
  const [tempLat, setTempLat] = useState<number>(23.794)
  const [tempLng, setTempLng] = useState<number>(90.412)

  // Final confirmed state
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [error, setError] = useState<string | null>(null)

  const requestRide = useMutation({
    mutationFn: async () => {
      const ride = await api.post<Ride>('/api/rides/request', {
        riderId,
        pickupLocation: pickup,
        dropoffLocation: dropoff,
      })

      try {
        return await api.put<Ride>(`/api/rides/${ride.id}/match`, {})
      } catch {
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

  function handleSetLocation() {
    const locString = `${tempLat.toFixed(6)}, ${tempLng.toFixed(6)}`
    if (activeTab === 'pickup') {
      setPickup(locString)
      setActiveTab('dropoff')
    } else {
      setDropoff(locString)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 mb-2">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-ink">Where to?</h1>
        <p className="text-base font-medium text-ink/70">
          Enter your pickup and destination to find a driver.
        </p>
      </header>

      <Card padded={false} className="overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-line bg-canvas">
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'pickup'
                ? 'text-ink border-b-2 border-ink'
                : 'text-muted hover:text-ink hover:bg-canvas-soft'
            }`}
            onClick={() => setActiveTab('pickup')}
          >
            Pickup
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'dropoff'
                ? 'text-ink border-b-2 border-ink'
                : 'text-muted hover:text-ink hover:bg-canvas-soft'
            }`}
            onClick={() => setActiveTab('dropoff')}
          >
            Dropoff
          </button>
        </div>

        {/* Map Area */}
        <div className="p-4 flex flex-col gap-4">
          <LocationPicker
            // Remount map if tab changes to ensure fresh state, or use stable state.
            // Using key forces remount to reset the center
            key={activeTab} 
            onLocationChange={(lat, lng) => {
              setTempLat(lat)
              setTempLng(lng)
            }}
          />
          <Button 
            variant="secondary" 
            onClick={handleSetLocation}
            fullWidth
          >
            {activeTab === 'pickup' ? 'Set Pickup Location' : 'Set Dropoff Location'}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {/* Summary View */}
        <div className="flex flex-col gap-3 p-4 bg-canvas-soft rounded-2xl">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Pickup</span>
            <span className="text-sm font-medium text-ink">{pickup || 'Not set'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Dropoff</span>
            <span className="text-sm font-medium text-ink">{dropoff || 'Not set'}</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger text-center">
            {error}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          fullWidth
          loading={requestRide.isPending}
          disabled={!pickup || !dropoff}
          onClick={onSubmit}
        >
          Request ride
        </Button>
      </div>

      <p className="text-xs text-muted text-center">
        Fares are estimated at a flat rate until the payment service is live.
      </p>
    </div>
  )
}
