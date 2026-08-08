import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/Button'
import { Card, CardRow } from '../../components/Card'
import { DriverCard } from '../../components/DriverCard'
import { Modal } from '../../components/Modal'
import { RideTimeline } from '../../components/RideTimeline'
import { RouteLine } from '../../components/RouteLine'
import { StatusPill } from '../../components/StatusPill'
import { useToast } from '../../components/Toast'
import { queryKeys, useRide } from '../../hooks/queries'
import { ApiError, api } from '../../lib/api'
import { STATUS_LABEL, formatFare } from '../../lib/format'
import { usePageTitle } from '../../hooks/usePageTitle'
import type { Ride, CreatePaymentIntentResponse } from '../../types'
import { SkeletonCard } from '../../components/Skeleton'
import { PaymentModal } from '../../components/PaymentModal'

interface ActiveRideProps {
  rideId: string
  riderId: string
  onDismiss: () => void
}

export function ActiveRide({ rideId, riderId, onDismiss }: ActiveRideProps) {
  usePageTitle('Your ride')
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentIntent, setPaymentIntent] = useState<CreatePaymentIntentResponse | null>(null)

  const { data: ride, isLoading } = useRide(rideId)

  const invalidate = (updated: Ride) => {
    queryClient.setQueryData(queryKeys.ride(rideId), updated)
    queryClient.invalidateQueries({ queryKey: queryKeys.ridesByRider(riderId) })
  }

  const cancelRide = useMutation({
    mutationFn: () => api.put<Ride>(`/api/rides/${rideId}/cancel`),
    onSuccess: (updated) => {
      invalidate(updated)
      setConfirmingCancel(false)
      notify('Ride cancelled')
    },
    onError: (caught) => {
      setConfirmingCancel(false)
      notify(caught instanceof ApiError ? caught.message : 'Could not cancel', 'error')
    },
  })

  const findDriver = useMutation({
    mutationFn: () => api.put<Ride>(`/api/rides/${rideId}/match`, {}),
    onSuccess: (updated) => {
      invalidate(updated)
      notify('Driver found. Hang tight.')
    },
    onError: (caught) => {
      notify(
        caught instanceof ApiError ? caught.message : 'Could not find a driver',
        'error',
      )
    },
  })

  // Automatically find next driver if the previous one rejected (pendingDriverId becomes null)
  useEffect(() => {
    if (ride && ride.status === 'REQUESTED' && !ride.driverId && !ride.pendingDriverId && !findDriver.isPending) {
      findDriver.mutate()
    }
  }, [ride, findDriver.isPending, findDriver.mutate])

  const initiatePayment = useMutation({
    mutationFn: () =>
      api.post<CreatePaymentIntentResponse>('/api/payments/create-intent', {
        rideId: ride?.id,
        riderId: ride?.riderId,
        driverId: ride?.driverId,
        pickupLat: ride?.pickupLat,
        pickupLng: ride?.pickupLng,
        dropoffLat: ride?.dropoffLat,
        dropoffLng: ride?.dropoffLng,
      }),
    onSuccess: (res) => {
      setPaymentIntent(res)
      setShowPayment(true)
    },
    onError: (caught) => {
      notify(caught instanceof ApiError ? caught.message : 'Could not initiate payment', 'error')
    },
  })

  if (isLoading || !ride) {
    return <SkeletonCard />
  }

  const finished = ride.status === 'COMPLETED' || ride.status === 'CANCELLED'
  
  useEffect(() => {
    if (finished && !ride.isPaid && ride.finalFare && ride.finalFare > 0) {
      if (!showPayment && !initiatePayment.isPending && !paymentIntent) {
        initiatePayment.mutate()
      }
    }
  }, [finished, ride.isPaid, ride.finalFare, showPayment, initiatePayment.isPending, paymentIntent, initiatePayment.mutate])

  const waitingForDriver = ride.status === 'REQUESTED' && !ride.driverId

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {finished ? 'Trip summary' : 'Your ride'}
          </h1>
          <p className="text-sm text-muted">
            {finished
              ? 'This trip has ended.'
              : 'We’ll keep this up to date automatically.'}
          </p>
        </div>
        <StatusPill status={ride.status} />
      </header>

      {/* Announce only the status change, not the whole timeline. */}
      <p className="sr-only" aria-live="polite">
        Ride status: {STATUS_LABEL[ride.status]}
      </p>

      <Card>
        <RideTimeline ride={ride} />
      </Card>

      {ride.driverId && (
        <Card>
          <DriverCard driverId={ride.driverId} />
        </Card>
      )}

      <Card>
        <RouteLine
          pickup={ride.pickupLocation}
          dropoff={ride.dropoffLocation}
        />
      </Card>

      <Card>
        <CardRow label="Fare estimate" value={formatFare(ride.fareEstimate)} />
        {ride.finalFare !== null && (
          <CardRow label="Final fare" value={formatFare(ride.finalFare)} />
        )}
      </Card>

      <div className="flex flex-col gap-2">
        {waitingForDriver && (
          <Button
            fullWidth
            size="lg"
            loading={findDriver.isPending || !!ride.pendingDriverId}
            onClick={() => {
              if (!ride.pendingDriverId && !findDriver.isPending) {
                findDriver.mutate()
              }
            }}
          >
            {ride.pendingDriverId ? 'Pinging nearest driver...' : 'Finding next driver...'}
          </Button>
        )}

        {finished ? (
          !ride.isPaid && ride.finalFare && ride.finalFare > 0 ? (
            <Button
              fullWidth
              size="lg"
              loading={initiatePayment.isPending}
              onClick={() => initiatePayment.mutate()}
            >
              Pay Now
            </Button>
          ) : (
            <Button fullWidth size="lg" onClick={onDismiss}>
              {ride.status === 'COMPLETED' ? 'Done' : 'Request another ride'}
            </Button>
          )
        ) : (
          <Button
            variant="danger"
            fullWidth
            onClick={() => setConfirmingCancel(true)}
          >
            Cancel ride
          </Button>
        )}
      </div>

      <Modal
        open={confirmingCancel}
        title="Cancel this ride?"
        description={
          ride.driverId
            ? 'Your driver will be released and this trip will be marked cancelled.'
            : 'This trip will be marked cancelled.'
        }
        confirmLabel="Cancel ride"
        cancelLabel="Keep ride"
        destructive
        loading={cancelRide.isPending}
        onConfirm={() => cancelRide.mutate()}
        onCancel={() => setConfirmingCancel(false)}
      />

      {ride && paymentIntent && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false)
            queryClient.invalidateQueries({ queryKey: queryKeys.ridesByRider(riderId) })
            notify('Payment successful!', 'success')
          }}
          clientSecret={paymentIntent.clientSecret}
          amount={paymentIntent.amount}
          ride={ride}
        />
      )}
    </div>
  )
}
