"use client";

import { useState, type SVGProps } from "react";
import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  legalDocuments,
  legalDocumentPaths,
  type LegalDocumentKey,
} from "@/content/legal-documents";

const legalLinks: Array<{ key: LegalDocumentKey; label: string }> = [
  { key: "terms", label: "Términos y Condiciones" },
  { key: "privacy", label: "Política de Privacidad" },
  { key: "cookies", label: "Política de Cookies" },
];

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.2 0-221.5 99.3-221.5 221.5 0 39.1 10.2 77.3 29.6 111L0 480l118.7-31.1c32.6 17.8 69.3 27.2 106.9 27.2h.1c122.3 0 221.6-99.3 221.6-221.5 0-59.3-23.1-115-65.4-157.5zM223.9 438.7c-33.2 0-65.7-8.9-94-25.6l-6.7-4-70.4 18.5 18.8-68.6-4.4-7c-18.5-29.4-28.2-63.4-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.9 34.9 54.1 81.2 54 130.5 0 101.8-82.9 184.8-184.5 184.8zm101.3-138.5c-5.5-2.8-32.8-16.1-37.9-17.9-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 17.9-17.6 21.6-3.3 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.3-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.3 4.6-12.9 4.6-24 3.2-26.3-1.3-2.4-5-3.8-10.5-6.6z" />
    </svg>
  );
}

export function Footer() {
  const [activeLegalKey, setActiveLegalKey] = useState<LegalDocumentKey | null>(null);
  const activeDocument = activeLegalKey ? legalDocuments[activeLegalKey] : null;

  return (
    <>
      <footer className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950 pb-8 pt-14 text-gray-300 sm:pt-16">
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-10 lg:mb-12">
            {/* Brand */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <img src="/Logo-vethogar.png" alt="Vethogar Logo" className="h-16 w-16 object-contain" />
                <span className="text-xl font-bold bg-gradient-to-r from-[#EC4899] via-[#7C3AED] to-[#4F46E5] bg-clip-text text-transparent">Vethogar</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Conectamos dueños responsables con veterinarios verificados. Tu mascota merece el mejor cuidado.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://www.facebook.com/people/VetHogar-Latinoamerica/61576302302949/?ref=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-purple-500/20 transition-all duration-300 border border-white/10"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="https://www.instagram.com/vethogar.lat/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-purple-500/20 transition-all duration-300 border border-white/10"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://wa.me/573222198440"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-purple-500/20 transition-all duration-300 border border-white/10"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Navegación</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-gray-400 hover:text-purple-400 transition-colors duration-300 flex items-center gap-2">
                    → Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/directorio" className="text-gray-400 hover:text-purple-400 transition-colors duration-300 flex items-center gap-2">
                    → Directorio
                  </Link>
                </li>
                <li>
                  <Link href="/acerca-de" className="text-gray-400 hover:text-purple-400 transition-colors duration-300 flex items-center gap-2">
                    → Acerca de
                  </Link>
                </li>
                <li>
                  <Link href="/soy-veterinario" className="text-gray-400 hover:text-purple-400 transition-colors duration-300 flex items-center gap-2">
                    → Soy Veterinario
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-3">
                {legalLinks.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => setActiveLegalKey(item.key)}
                      className="w-full text-left text-gray-400 hover:text-purple-400 transition-colors duration-300 flex items-center gap-2"
                    >
                      → {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Contacto</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <a href="mailto:vethogarlat@gmail.com" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">
                    vethogarlat@gmail.com
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <a href="tel:+573222198440" className="text-gray-400 hover:text-purple-400 transition-colors duration-300">
                    322 219 8440
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-400">
                    Bogotá, Colombia
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 pt-6 sm:pt-8">
            <div className="text-center text-gray-500">
              <p>© {new Date().getFullYear()} Vethogar. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={Boolean(activeDocument)} onOpenChange={(isOpen) => !isOpen && setActiveLegalKey(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border border-purple-100 bg-white rounded-2xl">
          {activeDocument ? (
            <>
              <div className="border-b border-purple-100 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 px-6 py-5">
                <DialogHeader className="text-left">
                  <DialogTitle className="text-xl font-bold text-gray-900">{activeDocument.title}</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    Última actualización: {activeDocument.lastUpdated}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
                <p className="text-sm leading-relaxed text-gray-700">{activeDocument.intro}</p>

                {activeDocument.sections.map((section) => (
                  <section key={section.title} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-relaxed text-gray-700">
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets?.length ? (
                      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                        {section.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}

                {activeLegalKey ? (
                  <div className="pt-2">
                    <Link
                      href={legalDocumentPaths[activeLegalKey]}
                      className="inline-flex items-center rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
                    >
                      Abrir en página completa
                    </Link>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
