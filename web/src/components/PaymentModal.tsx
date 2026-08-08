import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useState, useEffect } from 'react'
import { Button } from './Button'
import { formatFare } from '../lib/format'
import { api, ApiError } from '../lib/api'
import type { Ride } from '../types'

// Wait to load Stripe until we get the config from the backend
let stripePromise: Promise<any> | null = null

function getStripe() {
  if (!stripePromise) {
    stripePromise = api.get<{ publicKey: string }>('/api/payments/config').then((res) => {
      return loadStripe(res.publicKey)
    })
  }
  return stripePromise
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clientSecret: string
  amount: number
  ride: Ride
}

function CheckoutForm({ clientSecret, amount, ride, onSuccess, onClose }: PaymentModalProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    // Confirm the payment with Stripe
    const cardElement = elements.getElement(CardElement)
    if (!cardElement) return

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'An error occurred during payment.')
      setLoading(false)
      return
    }

    // Tell our backend it succeeded
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        await api.post('/api/payments/process', {
          rideId: ride.id,
          riderId: ride.riderId,
          driverId: ride.driverId,
          pickupLat: ride.pickupLat,
          pickupLng: ride.pickupLng,
          dropoffLat: ride.dropoffLat,
          dropoffLng: ride.dropoffLng,
          paymentIntentId: paymentIntent.id,
        })
        setLoading(false)
        onSuccess()
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not process payment on our servers.')
        setLoading(false)
      }
    } else {
      setError('Payment not successful.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center mb-2">
        <h2 className="text-xl font-semibold">Payment</h2>
        <p className="text-muted text-sm">Amount due: {formatFare(amount)}</p>
      </div>

      <div className="p-4 rounded-xl border border-line bg-surface shadow-sm">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1a1a1a',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }}
        />
      </div>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} fullWidth type="button">
          Cancel
        </Button>
        <Button loading={loading || !stripe} fullWidth type="submit">
          Pay {formatFare(amount)}
        </Button>
      </div>
    </form>
  )
}

export function PaymentModal(props: PaymentModalProps) {
  const [stripeConfigured, setStripeConfigured] = useState(false)

  useEffect(() => {
    if (props.isOpen) {
      getStripe().then(() => setStripeConfigured(true))
    }
  }, [props.isOpen])

  if (!props.isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-sm bg-elevated border border-line rounded-[var(--radius-card)] p-5 flex flex-col gap-4 shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        {stripeConfigured && props.clientSecret ? (
          <Elements stripe={getStripe()} options={{ clientSecret: props.clientSecret }}>
            <CheckoutForm {...props} />
          </Elements>
        ) : (
          <div className="py-8 text-center text-muted">Loading payment...</div>
        )}
      </div>
    </div>
  )
}
