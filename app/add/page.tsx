// app/add/page.tsx
'use client'

import { useState, useEffect } from 'react'
import UploadDropzone from '@/components/UploadDropzone'
import ParseConfirmForm from '@/components/ParseConfirmForm'
import { saveTournament } from './actions'
import type { ParseResult } from '@/types'

type Step = 'choose' | 'upload' | 'confirm'

const EMPTY_PARSE: ParseResult = {
  name: null, date: null, event: null, category: null, placement: null, partner: null,
  confidence: { name: 0, date: 0, event: 0, category: 0, placement: 0, partner: 0 },
}

function AiStepIndicator({ step }: { step: 'upload' | 'confirm' }) {
  const steps = [
    { key: 'upload', label: '업로드' },
    { key: 'confirm', label: 'AI 파싱 확인' },
    { key: 'done', label: '저장' },
  ]
  const activeIdx = steps.findIndex((s) => s.key === step)

  return (
    <div role="navigation" aria-label="진행 단계" className="flex items-center justify-center gap-2 border-b border-gray-200 bg-white py-3">
      {steps.map((s, i) => {
        const isDone = i < activeIdx
        const isActive = i === activeIdx
        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-gray-200" />}
            <div className="flex items-center gap-1.5">
              <div
                aria-current={isActive ? 'step' : undefined}
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
              <span className={`text-xs ${isActive ? 'font-semibold text-violet-600' : 'text-gray-400'}`}>
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
  const [step, setStep] = useState<Step>('choose')
  const [isManual, setIsManual] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParseResult>(EMPTY_PARSE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile)
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(selectedFile)
    })
    setError('')
    setIsLoading(true)

    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const res = await fetch('/api/parse', { method: 'POST', body: fd })

      if (res.ok) {
        const data = await res.json()
        setParsed(data)
      } else if (res.status === 422) {
        setParsed(EMPTY_PARSE)
      } else if (res.status === 413) {
        setParsed(EMPTY_PARSE)
        setError('파일이 너무 커요. 10MB 이하로 올려주세요.')
      } else {
        setParsed(EMPTY_PARSE)
        setError('AI 파싱에 실패했어요. 직접 입력해주세요.')
      }
    } catch {
      setParsed(EMPTY_PARSE)
      setError('네트워크 오류가 발생했어요. 직접 입력해주세요.')
    } finally {
      setIsLoading(false)
      setStep('confirm')
    }
  }

  function goManual() {
    setIsManual(true)
    setParsed(EMPTY_PARSE)
    setFile(null)
    setPreviewUrl(null)
    setError('')
    setStep('confirm')
  }

  function goAi() {
    setIsManual(false)
    setStep('upload')
  }

  function backToChoose() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setStep('choose')
    setIsManual(false)
    setFile(null)
    setPreviewUrl(null)
    setError('')
    setParsed(EMPTY_PARSE)
  }

  return (
    <main>
      {step === 'upload' && <AiStepIndicator step="upload" />}
      {step === 'confirm' && !isManual && <AiStepIndicator step="confirm" />}

      <div className="mx-auto max-w-lg px-5 py-6">

        {/* 입력 방법 선택 */}
        {step === 'choose' && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900">대회 기록 추가</h1>
            <p className="mb-5 text-sm text-gray-500">입력 방법을 선택해주세요</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={goAi}
                className="flex items-center gap-4 rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 text-left hover:border-violet-400 hover:bg-violet-100 transition-colors"
              >
                <span className="text-3xl" aria-hidden="true">📷</span>
                <div>
                  <p className="font-semibold text-gray-900">AI 파싱</p>
                  <p className="mt-0.5 text-sm text-gray-500">스크린샷을 올리면 AI가 자동으로 읽어드려요</p>
                </div>
              </button>
              <button
                type="button"
                onClick={goManual}
                className="flex items-center gap-4 rounded-2xl border-2 border-gray-200 bg-gray-50 p-5 text-left hover:border-gray-300 hover:bg-gray-100 transition-colors"
              >
                <span className="text-3xl" aria-hidden="true">✏️</span>
                <div>
                  <p className="font-semibold text-gray-900">직접 입력</p>
                  <p className="mt-0.5 text-sm text-gray-500">대회 정보를 직접 입력할게요</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* AI 파싱: 업로드 */}
        {step === 'upload' && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900">스크린샷 업로드</h1>
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
            <button
              type="button"
              onClick={backToChoose}
              className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              뒤로
            </button>
          </div>
        )}

        {/* 확인/입력 폼 */}
        {step === 'confirm' && (isManual || (file && previewUrl)) && (
          <div>
            <h1 className="mb-2 text-lg font-bold text-gray-900">
              {isManual ? '대회 정보 입력' : '파싱 결과 확인'}
            </h1>
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
              isManual={isManual}
            />
            <button
              type="button"
              onClick={isManual ? backToChoose : backToChoose}
              className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              뒤로
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
