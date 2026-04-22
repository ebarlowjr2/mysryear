declare module 'next/headers' {
  // We intentionally keep this minimal so `@mysryear/shared` can compile without
  // depending on Next.js types as a hard requirement.
  export function cookies(): any
}

