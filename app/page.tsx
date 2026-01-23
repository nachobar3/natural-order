import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import {
  MapPin,
  Repeat2,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react'

// FAQ data for landing page (simplified version)
const landingFaqs = [
  {
    question: '¿Cómo funciona el matching?',
    answer: 'Natural Order compara automáticamente tu wishlist con las colecciones de usuarios cercanos. Cuando hay coincidencias, te notificamos para que puedan coordinar el intercambio.'
  },
  {
    question: '¿Mis datos de ubicación son privados?',
    answer: 'Sí. Solo mostramos la distancia aproximada a otros usuarios. Tu ubicación exacta solo se comparte cuando ambas partes confirman un trade.'
  },
  {
    question: '¿Cómo se calculan los precios?',
    answer: 'Usamos Card Kingdom como referencia de mercado. Cada usuario define el porcentaje sobre el precio de referencia al listar sus cartas.'
  },
  {
    question: '¿Es gratis?',
    answer: 'Sí, Natural Order es completamente gratis. No cobramos comisiones por los trades ni tenemos planes pagos.'
  },
]

// Client component for FAQ accordion
function FAQAccordion() {
  return (
    <div className="space-y-3">
      {landingFaqs.map((faq, index) => (
        <details
          key={index}
          className="card group"
        >
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <span className="font-medium text-gray-100 pr-4">{faq.question}</span>
            <ChevronDown className="w-5 h-5 text-gray-500 group-open:hidden flex-shrink-0" />
            <ChevronUp className="w-5 h-5 text-mtg-green-400 hidden group-open:block flex-shrink-0" />
          </summary>
          <div className="mt-4 pt-4 border-t border-mtg-green-900/30">
            <p className="text-gray-300 text-sm leading-relaxed">
              {faq.answer}
            </p>
          </div>
        </details>
      ))}
    </div>
  )
}

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-16">
        {/* Logo and title */}
        <div className="text-center mb-8 animate-fade-in">
          <Image
            src="/logo-removebg-preview.png"
            alt="Natural Order"
            width={120}
            height={120}
            className="mx-auto mb-6"
            priority
          />
          <h1 className="logo-text text-4xl sm:text-5xl md:text-6xl mb-4">
            Natural Order
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 font-light max-w-2xl mx-auto">
            Trading de MTG con gente cerca tuyo
          </p>
        </div>

        {/* Value proposition */}
        <div className="max-w-xl mx-auto text-center mb-12 animate-fade-in">
          <p className="text-gray-400 text-lg leading-relaxed">
            Encontrá quien tiene las cartas que buscás, a metros de tu casa.
            Sin envíos, sin esperas, sin complicaciones.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
          <Link href="/register" className="btn-primary text-lg px-8">
            Empezá gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="btn-secondary text-lg px-8">
            Ya tengo cuenta
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-mtg-green-500/50" />
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-gray-100">
            ¿Cómo funciona?
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            En 3 simples pasos empezás a tradear
          </p>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Step 1 */}
            <div className="card text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-mtg-green-600/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-mtg-green-400" />
              </div>
              <div className="badge-green mb-4">Paso 1</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-100">
                Armá tu perfil
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Subí tu colección y wishlist. Podés importarlas desde Moxfield,
                Archidekt u otros servicios.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-mtg-green-600/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-mtg-green-400" />
              </div>
              <div className="badge-green mb-4">Paso 2</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-100">
                Configurá tu zona
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Definí tu ubicación y radio de búsqueda.
                Natural Order encuentra usuarios cercanos automáticamente.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-mtg-green-600/20 flex items-center justify-center">
                <Repeat2 className="w-8 h-8 text-mtg-green-400" />
              </div>
              <div className="badge-green mb-4">Paso 3</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-100">
                Hacé trades
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Cuando hay matches, coordinás con el otro usuario y
                se juntan a intercambiar. Así de simple.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features highlight */}
      <section className="px-4 py-16 md:py-24 bg-gradient-to-b from-transparent to-mtg-green-950/20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-mtg-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-100 mb-2">Instantáneo</h3>
                <p className="text-gray-400 text-sm">
                  Sin esperar envíos ni pagar shipping. Te juntás y listo.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-mtg-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-100 mb-2">Seguro</h3>
                <p className="text-gray-400 text-sm">
                  Tu ubicación exacta solo se comparte cuando confirmás un trade.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-mtg-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-100 mb-2">Comunidad</h3>
                <p className="text-gray-400 text-sm">
                  Conocé jugadores de tu zona y expandí tu red de trades.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-gray-100">
            Preguntas frecuentes
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Lo que más nos preguntan
          </p>

          <FAQAccordion />

          <p className="text-center mt-8 text-gray-500 text-sm">
            ¿Más preguntas? Escribinos a{' '}
            <a href="mailto:soporte@naturalorder.app" className="text-mtg-green-400 hover:underline">
              soporte@naturalorder.app
            </a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card-highlight">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-100">
              ¿Listo para empezar a tradear?
            </h2>
            <p className="text-gray-400 mb-8">
              Creá tu cuenta gratis y encontrá matches en tu zona
            </p>
            <Link href="/register" className="btn-primary text-lg px-8 inline-flex">
              Crear cuenta gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-mtg-green-900/30">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-removebg-preview.png"
              alt="Natural Order"
              width={32}
              height={32}
            />
            <span className="logo-text text-lg">Natural Order</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 Natural Order. Hecho con 💚 para la comunidad de MTG.
          </p>
        </div>
      </footer>
    </div>
  )
}
