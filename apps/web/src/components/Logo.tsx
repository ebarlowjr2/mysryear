import Image from 'next/image'
import React from 'react'

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/brand/mysryear-logo-header.png"
        alt="MySRYear"
        width={260}
        height={80}
        priority
        className="h-10 w-auto object-contain"
        sizes="260px"
      />
    </div>
  )
}
