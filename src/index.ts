function handler (event: FetchEvent): void {
  event.respondWith(
    new Response(JSON.stringify({ hello: 'worker' }), { status: 200 })
  )
}

addEventListener('fetch', handler)
