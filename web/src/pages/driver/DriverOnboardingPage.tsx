import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../auth/AuthContext'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { useToast } from '../../components/Toast'
import { ApiError, api } from '../../lib/api'
import type { DriverProfile } from '../../types'
import { AuthLayout } from '../auth/AuthLayout'

/**
 * Second step of driver signup. The backend keeps the user account and the
 * vehicle profile in separate services, so a driver is not matchable until
 * this profile exists.
 */
export function DriverOnboardingPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [vehicleModel, setVehicleModel] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await api.post<DriverProfile>('/api/drivers/profile', {
        userId: user.id,
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim(),
        vehicleColor: vehicleColor.trim(),
      })

      notify('Vehicle added. You can go online now.')
      navigate('/drive', { replace: true })
    } catch (caught) {
      // A 409 means the profile already exists, which is fine — move along.
      if (caught instanceof ApiError && caught.status === 409) {
        navigate('/drive', { replace: true })
        return
      }

      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not reach the server. Is the API Gateway running?',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Add your vehicle"
      subtitle="Riders see these details when you're matched to a trip."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Vehicle model"
          required
          value={vehicleModel}
          onChange={(event) => setVehicleModel(event.target.value)}
          placeholder="Toyota Axio"
        />
        <Input
          label="Licence plate"
          required
          value={vehiclePlate}
          onChange={(event) => setVehiclePlate(event.target.value)}
          placeholder="DHA-1234"
        />
        <Input
          label="Colour"
          required
          value={vehicleColor}
          onChange={(event) => setVehicleColor(event.target.value)}
          placeholder="White"
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Finish setup
        </Button>
      </form>
    </AuthLayout>
  )
}
