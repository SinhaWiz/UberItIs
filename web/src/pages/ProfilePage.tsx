import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth, useCurrentUser } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { Card, CardRow } from '../components/Card'
import { Input } from '../components/Input'
import { useToast } from '../components/Toast'
import { queryKeys, useDriverProfile } from '../hooks/queries'
import { ApiError, api } from '../lib/api'
import type { DriverProfile, User } from '../types'
import { usePageTitle } from '../hooks/usePageTitle'

export function ProfilePage() {
  usePageTitle('Profile')
  const user = useCurrentUser()
  const { updateUser } = useAuth()
  const queryClient = useQueryClient()
  const { notify } = useToast()

  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone)

  const saveProfile = useMutation({
    mutationFn: () =>
      // Only name and phone are applied by the backend; email and password
      // changes are intentionally unsupported.
      api.put<User>(`/api/users/${user.id}`, {
        name: name.trim(),
        phone: phone.trim(),
        role: user.role,
      }),
    onSuccess: (updated) => {
      updateUser(updated)
      queryClient.setQueryData(queryKeys.user(user.id), updated)
      notify('Profile updated')
    },
    onError: (caught) => {
      notify(
        caught instanceof ApiError ? caught.message : 'Could not save changes',
        'error',
      )
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    saveProfile.mutate()
  }

  const dirty = name.trim() !== user.name || phone.trim() !== user.phone

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2 mb-2">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-ink">Profile</h1>
        <p className="text-base font-medium text-ink/70">Your account details.</p>
      </header>

      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            label="Full name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label="Phone"
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />

          <Button
            type="submit"
            fullWidth
            loading={saveProfile.isPending}
            disabled={!dirty || !name.trim() || !phone.trim()}
          >
            Save changes
          </Button>
        </form>
      </Card>

      <Card>
        <CardRow label="Email" value={user.email} />
        <CardRow label="Role" value={user.role.toLowerCase()} />
      </Card>

      {user.role === 'DRIVER' && <VehicleSection userId={user.id} />}
    </div>
  )
}

/** Vehicle details live in driver-service, so they save separately. */
function VehicleSection({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const { data: profile } = useDriverProfile(userId)

  const [model, setModel] = useState('')
  const [plate, setPlate] = useState('')
  const [color, setColor] = useState('')
  const [initialised, setInitialised] = useState(false)

  // Seed the fields once the profile arrives.
  if (profile && !initialised) {
    setModel(profile.vehicleModel ?? '')
    setPlate(profile.vehiclePlate ?? '')
    setColor(profile.vehicleColor ?? '')
    setInitialised(true)
  }

  const saveVehicle = useMutation({
    mutationFn: () =>
      api.put<DriverProfile>(`/api/drivers/${userId}`, {
        vehicleModel: model.trim(),
        vehiclePlate: plate.trim(),
        vehicleColor: color.trim(),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.driverProfile(userId), updated)
      notify('Vehicle updated')
    },
    onError: (caught) => {
      notify(
        caught instanceof ApiError ? caught.message : 'Could not save vehicle',
        'error',
      )
    },
  })

  if (!profile) return null

  const dirty =
    model.trim() !== profile.vehicleModel ||
    plate.trim() !== profile.vehiclePlate ||
    color.trim() !== profile.vehicleColor

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-ink">Vehicle</h2>

        <Input
          label="Model"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        />
        <Input
          label="Licence plate"
          value={plate}
          onChange={(event) => setPlate(event.target.value)}
        />
        <Input
          label="Colour"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />

        <Button
          variant="secondary"
          fullWidth
          loading={saveVehicle.isPending}
          disabled={!dirty}
          onClick={() => saveVehicle.mutate()}
        >
          Save vehicle
        </Button>
      </div>
    </Card>
  )
}
