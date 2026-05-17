// app/add/page.tsx
'use client'

import { useState } from 'react'
import UploadDropzone from '@/components/UploadDropzone'
import ParseConfirmForm from '@/components/ParseConfirmForm'
import { saveTournament } from './actions'
import type { ParseResult } from '@/types'

type Step = 'upload' | 'confirm'

const EMPTY_PARSE: ParseResult = {
  name: null, date: null, event: null, category: null, placement: null,
  confidence: { name: 0, date: 0, event: 0, category: 0, placement: 0 },
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: 'upload', label: '업로드' },
    { key: 'confirm', label: 'AI 파싱 확인' },
    { key: 'done', label: '저장' },
  ]
  const activeIdx = steps.findIndex((s) => s.key === step)

  return (
    <div className="flex items-center justify-center gap-2 border-b border-gray-200 bg-white py-3">
      {steps.map((s, i) => {
        const isDone = i < activeIdx
        const isActive = i === activeIdx
        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-gray-200" />}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs ${
                  isActive ? 'font-semibold text-violet-600' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AddPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [parsed, setParsed] = useState<ParseResult>(EMPTY_PARSE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    setError('')
    setIsLoading(true)

    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const res = await fetch('/api/parse', { method: 'POST', body: fd })

      if (res.ok) {
        const data = await res.json()
        setParsed(data)
      } else {
        // Parsing failed — fall back to empty form
        setParsed(EMPTY_PARSE)
        if (res.status !== 422) {
          setError('AI 파싱에 실패했어요. 직접 입력해주세요.')
        }
      }
    } catch {
      setParsed(EMPTY_PARSE)
      setError('네트워크 오류가 발생했어요. 직접 입력해주세요.')
    } finally {
      setIsLoading(false)
      setStep('confirm')
    }
  }

  return (
    <main>
      <StepIndicator step={step} />
      <div className="mx-auto max-w-lg px-5 py-6">
        {step === 'upload' && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900">대회 기록 추가</h1>
            <p className="mb-5 text-sm text-gray-500">
              스크린샷을 올리면 AI가 대회 정보를 자동으로 읽어드려요
            </p>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-violet-300 bg-violet-50 p-10">
                <div className="text-2xl animate-spin">🏸</div>
                <p className="mt-3 text-sm text-violet-600">AI가 스크린샷을 분석 중이에요...</p>
              </div>
            ) : (
              <UploadDropzone onFileSelect={handleFileSelect} />
            )}
          </div>
        )}

        {step === 'confirm' && file && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900">파싱 결과 확인</h1>
            {error && (
              <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {error}
              </div>
            )}
            <ParseConfirmForm
              parsed={parsed}
              screenshotPreviewUrl={previewUrl}
              action={saveTournament}
              file={file}
            />
            <button
              type="button"
              onClick={() => {
                setStep('upload')
                setFile(null)
                setPreviewUrl('')
                setError('')
              }}
              className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              다시 업로드
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
