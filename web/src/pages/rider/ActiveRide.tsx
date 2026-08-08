import { useState, useEffect, useCallback, useRef } from 'react'
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

/**
 * Helper: does this ride require payment before the rider can move on?
 */
function needsPayment(ride: Ride | undefined): boolean {
  if (!ride) return false
  const finished = ride.status === 'COMPLETED'
  return finished && !ride.isPaid && !!ride.finalFare && ride.finalFare > 0
}

export function ActiveRide({ rideId, riderId, onDismiss }: ActiveRideProps) {
  usePageTitle('Your ride')
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentIntent, setPaymentIntent] = useState<CreatePaymentIntentResponse | null>(null)
  const [localPaid, setLocalPaid] = useState(false)
  // Track whether we already attempted to initiate payment (prevents re-fire loops)
  const paymentInitiatedRef = useRef(false)

  const { data: ride, isLoading } = useRide(rideId)

  const invalidate = (updated: Ride) => {
    queryClient.setQueryData(queryKeys.ride(rideId), updated)
    queryClient.invalidateQueries({ queryKey: queryKeys.ridesByRider(riderId) })
  }

  /**
   * Directly calls the create-intent API with a given ride object.
   * This avoids stale-closure issues by accepting the ride as a parameter.
   */
  const doInitiatePayment = useCallback(
    async (forRide: Ride) => {
      if (paymentInitiatedRef.current) return
      paymentInitiatedRef.current = true
      try {
        const res = await api.post<CreatePaymentIntentResponse>('/api/payments/create-intent', {
          rideId: forRide.id,
          riderId: forRide.riderId,
          driverId: forRide.driverId,
          pickupLat: forRide.pickupLat,
          pickupLng: forRide.pickupLng,
          dropoffLat: forRide.dropoffLat,
          dropoffLng: forRide.dropoffLng,
          finalFare: forRide.finalFare,
        })
        setPaymentIntent(res)
        setShowPayment(true)
      } catch (caught) {
        notify(caught instanceof ApiError ? caught.message : 'Could not initiate payment', 'error')
        // Allow retry
        paymentInitiatedRef.current = false
      }
    },
    [notify],
  )

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

  // Optimistically treat the ride as paid if we just succeeded locally
  const requiresPayment = needsPayment(ride) && !localPaid

  /**
   * Auto-trigger payment when ride finishes with an unpaid fare.
   * This handles the COMPLETED case (detected via polling) and also
   * serves as a fallback for CANCELLED (primary trigger is in cancelRide.onSuccess).
   *
   * IMPORTANT: This hook is BEFORE any conditional returns to satisfy the Rules of Hooks.
   */
  useEffect(() => {
    if (ride && requiresPayment && !showPayment && !paymentInitiatedRef.current && !paymentIntent) {
      doInitiatePayment(ride)
    }
  }, [ride, requiresPayment, showPayment, paymentIntent, doInitiatePayment])

  // Reset the payment initiated ref when ride changes to a new non-terminal ride
  useEffect(() => {
    if (ride && !needsPayment(ride) && ride.status !== 'COMPLETED' && ride.status !== 'CANCELLED') {
      paymentInitiatedRef.current = false
    }
  }, [ride])

  if (isLoading || !ride) {
    return <SkeletonCard />
  }

  const finished = ride.status === 'COMPLETED' || ride.status === 'CANCELLED'
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
              : 'We\u2019ll keep this up to date automatically.'}
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
          requiresPayment ? (
            <Button
              fullWidth
              size="lg"
              loading={paymentInitiatedRef.current && !paymentIntent}
              onClick={() => {
                paymentInitiatedRef.current = false // allow retry
                doInitiatePayment(ride)
              }}
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
        description="This trip will be marked as cancelled. You will not be charged."
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
          onClose={() => {}} // Cannot be dismissed — payment is mandatory
          onSuccess={() => {
            setShowPayment(false)
            setPaymentIntent(null)
            setLocalPaid(true)
            queryClient.invalidateQueries({ queryKey: queryKeys.ride(rideId) })
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
