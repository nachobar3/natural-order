'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

interface FAQ {
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    question: '¿Cómo funciona el algoritmo de matching?',
    answer: `Natural Order compara tu wishlist con las colecciones de otros usuarios cercanos, y viceversa. Cuando hay coincidencias, se crea un "match". Los matches pueden ser:

• **Intercambio:** Ambos tienen cartas que el otro busca
• **Compra:** El otro usuario tiene cartas que vos buscás
• **Venta:** Vos tenés cartas que el otro busca

El sistema prioriza matches cercanos geográficamente y con mayor cantidad de cartas coincidentes.`
  },
  {
    question: '¿Cómo se calcula el Score de un trade?',
    answer: `El Score es un puntaje de 0 a 100 que indica qué tan conveniente es un trade. Se calcula considerando varios factores:

• **Tipo de match (hasta 30 pts):** Los intercambios mutuos tienen mayor puntaje que compras o ventas unilaterales
• **Eficiencia de precio (hasta 25 pts):** Mientras más descuento ofrezca el vendedor respecto al precio de mercado, mayor puntaje
• **Cantidad de cartas (hasta 25 pts):** Más cartas en el trade = mayor puntaje
• **Valor total (hasta 20 pts):** Trades de mayor valor en USD tienen más peso
• **Distancia (hasta 15 pts):** Usuarios más cercanos suman más puntos (0km = 15pts, 50km+ = 0pts)
• **Alertas de precio (-5 pts):** Si hay cartas con precios que exceden tu máximo configurado, se resta puntaje

Un score de 70+ se considera excelente, 50-70 es bueno, y menos de 50 es un trade regular.`
  },
  {
    question: '¿Qué significan los estados de un trade?',
    answer: `Cada trade pasa por diferentes estados durante su ciclo de vida:

• **Disponible:** Match recién encontrado, aún no contactaste al usuario
• **Contactado:** Dejaste un comentario o iniciaste conversación
• **Solicitado:** Una de las partes solicitó formalizar el trade
• **Confirmado:** Ambas partes confirmaron el trade y acordaron encontrarse
• **Realizado:** El trade se completó exitosamente
• **Cancelado:** El trade fue cancelado por alguna de las partes
• **Descartado:** Decidiste no continuar con este match (podés restaurarlo después)

Los trades en estado "Solicitado" o "Confirmado" pueden volver a "Disponible" si se editan las cartas del trade.`
  },
  {
    question: '¿Cómo se calculan los precios?',
    answer: `Usamos Card Kingdom como referencia de mercado. Cuando listás una carta en tu colección, elegís un porcentaje sobre ese precio de referencia (por ejemplo, 80% significa un 20% de descuento).

Esto permite comparar ofertas de forma justa entre diferentes usuarios. Podés definir un descuento global para toda tu colección desde la página de Colección, o ajustar el precio individualmente para cada carta.`
  },
  {
    question: '¿Mis datos de ubicación son privados?',
    answer: `Sí, tu privacidad es importante. Nunca mostramos tu ubicación exacta a otros usuarios. Solo mostramos la distancia aproximada (por ejemplo, "~2 km") para que sepan qué tan cerca están.

Tu dirección exacta solo se comparte cuando confirmás un trade y ambas partes acuerdan encontrarse.`
  },
  {
    question: '¿Cómo funciona el flujo de un trade?',
    answer: `El proceso de un trade tiene estos pasos:

1. **Encontrás un match** y dejás un comentario para coordinar
2. **Negociación:** Pueden chatear, agregar o quitar cartas del trade
3. **Solicitud:** Cuando están de acuerdo, cualquiera puede "Solicitar trade"
4. **Confirmación:** Ambos deben confirmar el trade
5. **Encuentro:** Se juntan, intercambian las cartas
6. **Completar:** Marcan el trade como "Completado"

Si hay algún problema, pueden cancelar el trade en cualquier momento antes de completarlo.`
  },
  {
    question: '¿Qué pasa si el otro usuario no responde?',
    answer: `Tenés varias opciones:

• **Esperar:** Algunos usuarios revisan la app con menos frecuencia
• **Descartar:** Podés descartar el match y no lo verás más
• **Restaurar:** Si cambiás de opinión, podés restaurar matches descartados desde el Historial

Los matches no tienen fecha de vencimiento, así que siempre podés volver a intentar si el otro usuario reactiva su cuenta.`
  },
]

export default function FAQsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-mtg-green-600/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-mtg-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Preguntas Frecuentes</h1>
          <p className="text-sm text-gray-500">Todo lo que necesitás saber sobre Natural Order</p>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index

          return (
            <div
              key={index}
              className="card overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="font-medium text-gray-100 pr-4">{faq.question}</span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-mtg-green-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="mt-4 pt-4 border-t border-mtg-green-900/30">
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line prose prose-invert prose-sm max-w-none">
                    {faq.answer.split('\n').map((paragraph, pIndex) => {
                      // Check if paragraph starts with bullet point
                      if (paragraph.trim().startsWith('•')) {
                        return (
                          <p key={pIndex} className="ml-2 my-1">
                            {paragraph.split('**').map((part, partIndex) =>
                              partIndex % 2 === 1 ? (
                                <strong key={partIndex} className="text-gray-100">{part}</strong>
                              ) : (
                                part
                              )
                            )}
                          </p>
                        )
                      }
                      // Check if paragraph starts with number (ordered list)
                      if (/^\d+\./.test(paragraph.trim())) {
                        return (
                          <p key={pIndex} className="ml-2 my-1">
                            {paragraph.split('**').map((part, partIndex) =>
                              partIndex % 2 === 1 ? (
                                <strong key={partIndex} className="text-gray-100">{part}</strong>
                              ) : (
                                part
                              )
                            )}
                          </p>
                        )
                      }
                      // Regular paragraph
                      if (paragraph.trim()) {
                        return (
                          <p key={pIndex} className="my-2">
                            {paragraph.split('**').map((part, partIndex) =>
                              partIndex % 2 === 1 ? (
                                <strong key={partIndex} className="text-gray-100">{part}</strong>
                              ) : (
                                part
                              )
                            )}
                          </p>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Contact section */}
      <div className="card bg-gray-900/50">
        <h3 className="font-medium text-gray-100 mb-2">¿Tenés otra pregunta?</h3>
        <p className="text-sm text-gray-400">
          Si no encontraste la respuesta que buscabas, podés escribirnos a{' '}
          <a
            href="mailto:soporte@naturalorder.app"
            className="text-mtg-green-400 hover:text-mtg-green-300 underline"
          >
            soporte@naturalorder.app
          </a>
        </p>
      </div>
    </div>
  )
}
