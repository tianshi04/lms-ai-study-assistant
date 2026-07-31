# Async Patterns

In Next.js 15+, `params`, `searchParams`, `cookies()`, and `headers()` are asynchronous.

> **When `cacheComponents: true` is active**: Awaiting `params`, `searchParams`, `cookies()`, or
> `headers()` at the top level of a page or layout blocks prerendering and causes a build error.
> Forward the promise as a prop into a `<Suspense>`-wrapped child and await it there instead.
>
> ```tsx
> // Bad with cacheComponents: await at top-level blocks prerender
> export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
>   const { slug } = await params  // blocking!
>   return <Content slug={slug} />
> }
>
> // Good with cacheComponents: forward promise into Suspense child
> export default function Page({ params }: { params: Promise<{ slug: string }> }) {
>   return (
>     <Suspense fallback={<Skeleton />}>
>       <Content params={params} />
>     </Suspense>
>   )
> }
>
> async function Content({ params }: { params: Promise<{ slug: string }> }) {
>   const { slug } = await params  // safe inside Suspense
>   return <div>{slug}</div>
> }
> ```

## Async Params and SearchParams

Always type them as `Promise<...>` and await them.

### Pages and Layouts

```tsx
type Props = { params: Promise<{ slug: string }> }

export default async function Page({ params }: Props) {
  const { slug } = await params
}
```

### Route Handlers

```tsx
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

### SearchParams

```tsx
type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ query?: string }>
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params
  const { query } = await searchParams
}
```

### Synchronous Components

Use `React.use()` for non-async components:

```tsx
import { use } from 'react'

type Props = { params: Promise<{ slug: string }> }

export default function Page({ params }: Props) {
  const { slug } = use(params)
}
```

### generateMetadata

```tsx
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: slug }
}
```

## Async Cookies and Headers

> **When `cacheComponents: true` is active**: Same rule — push the read into a
> `<Suspense>`-wrapped child instead of awaiting at the page top-level.

```tsx
import { cookies, headers } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const headersList = await headers()

  const theme = cookieStore.get('theme')
  const userAgent = headersList.get('user-agent')
}
```

## Migration Codemod

```bash
npx @next/codemod@latest next-async-request-api .
```
