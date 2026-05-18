import { notFound } from 'next/navigation'
import { decodeImportPayload } from '@/lib/import'
import ImportForm from '@/components/ImportForm'

export default async function ImportPage({
  params,
}: {
  params: Promise<{ data: string }>
}) {
  const { data } = await params
  const payload = decodeImportPayload(data)
  if (!payload) notFound()

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-6">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-gray-900">대회 기록 가져오기</h1>
        <p className="mt-1 text-sm text-gray-500">
          파트너가 공유한 대회예요. 파트너 이름만 수정하고 저장하세요.
        </p>
      </div>
      <ImportForm payload={payload} encodedData={data} />
    </main>
  )
}
