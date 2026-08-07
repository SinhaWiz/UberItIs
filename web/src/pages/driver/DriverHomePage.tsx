import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '../../auth/AuthContext'
import { Button } from '../../components/Button'
import { Card, CardRow } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Input } from '../../components/Input'
import { SkeletonCard } from '../../components/Skeleton'
import { Toggle } from '../../components/Toggle'
import { useToast } from '../../components/Toast'
import {
  queryKeys,
  useDriverProfile,
  useRidesByDriver,
} from '../../hooks/queries'
import { ApiError, api } from '../../lib/api'
import type { DriverProfile, Ride } from '../../types'
import { LocationPicker } from '../../components/LocationPicker'
import { AssignedRide } from './AssignedRide'
import { usePageTitle } from '../../hooks/usePageTitle'

/** Trips the driver is actively responsible for right now. */
function findAssignedRide(rides: Ride[] | undefined): Ride | undefined {
  return rides?.find(
    (ride) => ride.status === 'MATCHED' || ride.status === 'IN_PROGRESS',
  )
}

export function DriverHomePage() {
  usePageTitle('Drive')
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const { notify } = useToast()

  const {
    data: profile,
    isLoading: loadingProfile,
    isError: profileMissing,
  } = useDriverProfile(user.id)

  const { data: rides } = useRidesByDriver(user.id, true)
  const assignedRide = findAssignedRide(rides)

  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  const setAvailability = useMutation({
    mutationFn: (isAvailable: boolean) =>
      api.put<DriverProfile>(`/api/drivers/${user.id}/availability`, {
        isAvailable,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.driverProfile(user.id), updated)
      notify(updated.isAvailable ? 'You’re online' : 'You’re offline')
    },
    onError: (caught) => {
      notify(
        caught instanceof ApiError ? caught.message : 'Could not update status',
        'error',
      )
    },
  })

  const updateLocation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) =>
      api.put<DriverProfile>(`/api/drivers/${user.id}/location`, coords),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.driverProfile(user.id), updated)
      notify('Location updated')
    },
    onError: (caught) => {
      notify(
        caught instanceof ApiError ? caught.message : 'Could not update location',
        'error',
      )
    },
  })

  function readCurrentPosition() {
    if (!navigator.geolocation) {
      notify('Location is not available in this browser', 'error')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6))
        setLongitude(position.coords.longitude.toFixed(6))
      },
      () => notify('Could not read your location', 'error'),
    )
  }

  if (loadingProfile) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  // driver-service 404s until the vehicle profile exists.
  if (profileMissing || !profile) {
    return (
      <Card padded={false}>
        <EmptyState
          title="Finish setting up"
          description="Add your vehicle details before you can go online and accept trips."
          action={
            <Link to="/drive/onboarding">
              <Button>Add vehicle</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  if (assignedRide) {
    return <AssignedRide ride={assignedRide} driverId={user.id} />
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 mb-2">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-ink">
          {profile.isAvailable ? 'You’re online' : 'You’re offline'}
        </h1>
        <p className="text-base font-medium text-ink/70">
          {profile.isAvailable
            ? 'Waiting for a trip to come your way.'
            : 'Go online to start receiving trips.'}
        </p>
      </header>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-ink">Availability</span>
            <span className="text-xs text-muted">
              {profile.isAvailable ? 'Accepting trips' : 'Not accepting trips'}
            </span>
          </div>
          <Toggle
            label="Toggle availability"
            checked={profile.isAvailable}
            disabled={setAvailability.isPending}
            onChange={(next) => setAvailability.mutate(next)}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-ink">Current location</span>
            <button
              type="button"
              onClick={readCurrentPosition}
              className="text-sm font-medium text-accent hover:underline"
            >
              Use my location
            </button>
          </div>

          <div className="mt-2 mb-4">
            <LocationPicker 
              initialLatitude={profile.currentLatitude || undefined}
              initialLongitude={profile.currentLongitude || undefined}
              onLocationChange={(lat, lng) => {
                setLatitude(lat.toFixed(6))
                setLongitude(lng.toFixed(6))
              }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude"
              inputMode="decimal"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder={String(profile.currentLatitude)}
            />
            <Input
              label="Longitude"
              inputMode="decimal"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder={String(profile.currentLongitude)}
            />
          </div>

          <Button
            variant="secondary"
            fullWidth
            loading={updateLocation.isPending}
            disabled={!latitude.trim() || !longitude.trim()}
            onClick={() =>
              updateLocation.mutate({
                latitude: Number(latitude),
                longitude: Number(longitude),
              })
            }
          >
            Update location
          </Button>
        </div>
      </Card>

      <Card>
        <CardRow
          label="Vehicle"
          value={`${profile.vehicleColor} ${profile.vehicleModel}`}
        />
        <CardRow label="Plate" value={profile.vehiclePlate} />
        <CardRow label="Trips completed" value={profile.totalRides} />
      </Card>
    </div>
  )
}
