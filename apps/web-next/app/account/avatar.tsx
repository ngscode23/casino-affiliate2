'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

const clampSize = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }
  const rounded = Math.round(value)
  if (rounded < 0) {
    return 0
  }
  if (rounded > 512) {
    return 512
  }
  return rounded
}

export default function Avatar({
  uid,
  url,
  size,
  onUpload,
}: {
  uid: string | null
  url: string | null
  size: number
  onUpload: (url: string) => void
}) {
  const supabase = createClient()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(url)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function downloadImage(path: string) {
      try {
        const { data, error } = await supabase.storage.from('avatars').download(path)
        if (error) {
          throw error
        }

        const url = URL.createObjectURL(data)
        setAvatarUrl(url)
      } catch (error) {
        console.log('Error downloading image: ', error)
      }
    }

    if (url) downloadImage(url)
  }, [url, supabase])

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${uid}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      onUpload(filePath)
    } catch (error) {
      alert('Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  const clampedSize = clampSize(size)
  const avatarSizeClass = `size-px-${clampedSize}`
  const widthClass = `w-px-${clampedSize}`

  return (
    <div>
      {avatarUrl ? (
        <Image
          width={size}
          height={size}
          src={avatarUrl}
          alt="Avatar"
          className={`rounded-full border border-border/60 bg-card/60 object-cover shadow-[0_28px_68px_-36px_rgba(6,18,34,0.82)] ${avatarSizeClass}`}
        />
      ) : (
        <div
          className={`flex items-center justify-center rounded-full border border-dashed border-border/50 bg-card/40 text-sm font-medium text-muted ${avatarSizeClass}`}
        >
          No image
        </div>
      )}
      <div className={`mt-4 flex flex-col items-center ${widthClass} max-w-full`}>
        <label
          className="inline-flex w-full max-w-xs items-center justify-center rounded-full border border-primary/50 bg-primary px-6 py-3 text-sm font-semibold text-primaryfg shadow-[0_24px_58px_-32px_rgba(252,50,114,0.7)] transition hover:-translate-y-[1px] hover:shadow-[0_30px_72px_-32px_rgba(252,50,114,0.82)]"
          htmlFor="single"
        >
          {uploading ? 'Uploading ...' : 'Upload'}
        </label>
        <input
          className="hidden"
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </div>
    </div>
  )
}
