import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HOME_BY_ROLE, useAuth } from '../../auth/AuthContext'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ApiError } from '../../lib/api'
import { cn } from '../../lib/format'
import type { Role } from '../../types'
import { AuthLayout } from './AuthLayout'
import { usePageTitle } from '../../hooks/usePageTitle'

/** Admins are seeded by the team rather than self-registered. */
const SIGNUP_ROLES: Array<{ value: Role; label: string; hint: string }> = [
  { value: 'RIDER', label: 'Rider', hint: 'Request rides' },
  { value: 'DRIVER', label: 'Driver', hint: 'Accept and drive trips' },
]

export function RegisterPage() {
  usePageTitle('Create account')
  const { register } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role>('RIDER')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      })

      // Drivers still need vehicle details before they can be matched.
      navigate(
        user.role === 'DRIVER' ? '/drive/onboarding' : HOME_BY_ROLE[user.role],
        { replace: true },
      )
    } catch (caught) {
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
      title="Create your account"
      subtitle="One account, whichever side of the trip you're on."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-ink mb-1.5">
            I want to
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {SIGNUP_ROLES.map((option) => {
              const selected = role === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    'flex flex-col items-start gap-0.5 p-4 rounded-xl',
                    'border-2 text-left transition-colors duration-150',
                    selected
                      ? 'border-ink bg-canvas-soft'
                      : 'border-transparent bg-canvas-soft hover:bg-surface',
                  )}
                >
                  <span className="text-sm font-medium text-ink">
                    {option.label}
                  </span>
                  <span className="text-xs text-muted">{option.hint}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <Input
          label="Full name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Alice Rahman"
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+8801711111111"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
