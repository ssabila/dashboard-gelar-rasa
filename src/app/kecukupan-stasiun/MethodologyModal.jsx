'use client'

import { useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, HelpCircle, X, XCircle } from 'lucide-react'

export function MethodologyModal({ isOpen, onClose, metadata }) {
  const [activeTab, setActiveTab] = useState('faq') // 'faq' | 'dictionary' | 'weights'

  // Esc listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const faqs = metadata?.faq_sections || []
  const dictionary = metadata?.terminology_dictionary || { avoid_terms: [], approved_terms: [] }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Metodologi &amp; Batasan Analisis</h2>
              <p className="text-xs text-slate-500">Prinsip analitik, formula, dan batasan interpretasi modul</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 bg-white gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'faq' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Pertanyaan Metodologi (FAQ)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dictionary')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'dictionary' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Kamus Istilah Resmi (PRD)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'weights' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Bobot &amp; Kriteria MCDA
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-600">
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2 mb-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    {faq.question}
                  </h4>
                  <p className="text-slate-600 leading-relaxed pl-5.5">{faq.answer}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dictionary' && (
            <div className="space-y-4">
              <p className="text-slate-500">
                Sesuai PRD Section 8, analisis ini menggunakan bahasa indikatif yang terikat langsung pada bukti data tanpa klaim kausalitas atau cakupan absolut.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200">
                  <div className="font-bold text-rose-800 mb-2.5 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Istilah yang Dihindari
                  </div>
                  <ul className="space-y-1.5 text-rose-900/80 pl-2">
                    {dictionary.avoid_terms.map((term, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-400">&bull;</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <div className="font-bold text-emerald-800 mb-2.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Istilah yang Digunakan (Resmi)
                  </div>
                  <ul className="space-y-1.5 text-emerald-900/80 pl-2">
                    {dictionary.approved_terms.map((term, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-500">&bull;</span>
                        <span className="font-medium">{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'weights' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-800 mb-2">1. Dimensi Prioritas Distribusi (Spasial)</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span>Jarak ke Tetangga Terdekat (<code className="text-slate-800">d_min</code>)</span>
                    <strong className="text-sky-700">50% Bobot</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span>Kerapuhan Regional (<code className="text-slate-800">1 / N_region</code>)</span>
                    <strong className="text-sky-700">30% Bobot</strong>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span>Kelangkaan Tipe Lokasi (<code className="text-slate-800">1 / N_site_type</code>)</span>
                    <strong className="text-sky-700">20% Bobot</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-800 mb-2">2. Dimensi Prioritas Operasional &amp; Data</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span>Status Sensor Operasional (Defective / Intermittent)</span>
                    <strong className="text-amber-700">35% Bobot</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span>Gap Kelengkapan Observasi (<code className="text-slate-800">100 - Completeness%</code>)</span>
                    <strong className="text-amber-700">35% Bobot</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span>Laju QC Cacat (<code className="text-slate-800">Invalid / Recorded</code>)</span>
                    <strong className="text-amber-700">20% Bobot</strong>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span>Isu Sinkronisasi Unit Logger (Format ppm non-standar)</span>
                    <strong className="text-amber-700">10% Bobot</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

