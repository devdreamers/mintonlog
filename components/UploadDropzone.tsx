// components/UploadDropzone.tsx
'use client'

import { useRef, useState } from 'react'

interface Props {
  onFileSelect: (file: File) => void
}

const MAX_BYTES = 10 * 1024 * 1024

export default function UploadDropzone({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 올릴 수 있어요.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('10MB 이하의 파일만 올릴 수 있어요.')
      return
    }
    setError('')
    onFileSelect(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="클릭하거나 드래그해서 스크린샷 업로드"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
        }}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors ${
          isDragging
            ? 'border-violet-500 bg-violet-50'
            : 'border-gray-300 bg-gray-50 hover:border-violet-400 hover:bg-violet-50'
        }`}
      >
        <span className="text-4xl" aria-hidden="true">📷</span>
        <p className="mt-3 text-center text-sm text-gray-500">
          <span className="font-semibold text-violet-600">클릭하거나 드래그</span>해서 스크린샷을 올려주세요
          <br />
          배드민턴 앱 결과 화면, 대회 결과표 모두 OK
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
      {error && (
        <p className="mt-2 text-center text-xs text-red-500">{error}</p>
      )}
    </>
  )
}
