// Retry a read once after a transient transport or gateway failure.
// Writes and token refreshes must never be replayed here.
export function createReliableFetch(fetchImpl = (...args) => fetch(...args), pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  return async (input, init = {}) => {
    const method = String(init.method || input?.method || 'GET').toUpperCase()
    const signal = init.signal || input?.signal
    const canRetry = ['GET', 'HEAD'].includes(method)
    try {
      const response = await fetchImpl(input, init)
      if (!canRetry || ![502, 503, 504].includes(response.status) || signal?.aborted) return response
      await pause(400)
      return fetchImpl(input, init)
    } catch (error) {
      if (!canRetry || signal?.aborted || error?.name === 'AbortError' || error?.name !== 'TypeError') throw error
      await pause(400)
      return fetchImpl(input, init)
    }
  }
}
