import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh flex flex-col bg-canvas font-sans text-ink">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-4 bg-canvas">
        <div className="text-2xl font-bold tracking-tight text-ink">Uber</div>
        <div className="flex gap-4">
          <Button 
            variant="ghost" 
            className="rounded-full hover:bg-surface text-ink" 
            onClick={() => navigate('/login')}
          >
            Log in
          </Button>
          <Button 
            variant="primary" 
            className="rounded-full bg-primary text-on-primary hover:opacity-90" 
            onClick={() => navigate('/register')}
          >
            Sign up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="bg-canvas text-ink px-6 py-16 md:py-24 lg:px-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h1 className="text-5xl md:text-[52px] font-bold leading-[1.1] tracking-tight mb-6">
              Go anywhere with Uber
            </h1>
            <p className="text-lg md:text-xl font-medium mb-8 text-ink/80">
              Request a ride, hop in, and go.
            </p>
            <Button 
              size="lg" 
              className="rounded-full bg-primary text-on-primary hover:opacity-90" 
              onClick={() => navigate('/register')}
            >
              Sign up to ride
            </Button>
          </div>
          <div className="flex-1 w-full max-w-lg">
             <div className="w-full rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
                <img src="/hero.png" alt="Hero" className="w-full h-auto object-cover" />
             </div>
          </div>
        </section>

        {/* Drive section (dark band) */}
        <section className="bg-primary text-on-primary px-6 py-16 md:py-24 lg:px-24 flex flex-col md:flex-row-reverse items-center gap-12">
           <div className="flex-1">
            <h2 className="text-4xl md:text-[52px] font-bold leading-[1.1] tracking-tight mb-6">
              Drive when you want, make what you need
            </h2>
            <p className="text-lg text-on-primary/80 mb-8 font-medium">
              Earn on your own schedule.
            </p>
            <Button 
              size="lg" 
              className="rounded-full bg-canvas text-ink hover:bg-surface border-none" 
              onClick={() => navigate('/register')}
            >
              Get started
            </Button>
          </div>
          <div className="flex-1 w-full max-w-md">
             <div className="aspect-[4/3] bg-ink rounded-2xl flex items-center justify-center overflow-hidden">
                <img src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800" alt="Drive" className="w-full h-full object-cover opacity-90" />
             </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-on-primary px-6 py-12 lg:px-24">
        <div className="text-2xl font-bold tracking-tight mb-6">Uber</div>
        <div className="text-sm text-on-primary/70">
          © {new Date().getFullYear()} Uber Technologies Inc. Clone
        </div>
      </footer>
    </div>
  )
}
