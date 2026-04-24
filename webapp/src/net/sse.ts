export interface SseEvent {
  event?: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export type SseEventHandler = (fields: SseEvent) => void

/**
 * Parse one SSE event block (lines separated from the next block by a blank line).
 *
 * Implements the SSE parsing rules described by MDN:
 * - Messages are separated by a blank line.
 * - Lines starting with `:` are comments and ignored.
 * - Each line is `field: value` (first `:` splits); if no `:`, value is empty string.
 * - If the first character of `value` is a single space, it is removed.
 * - Known fields: `event`, `data`, `id`, `retry`. Unknown fields are ignored.
 * - Multiple `data:` lines are concatenated with `\n` between them.
 *
 */
function dispatchSseBlock(block: string, onEvent: SseEventHandler): void {
  let eventName = "message"
  let id: string | undefined
  let retry: number | undefined
  const dataLines: string[] = [];

  for (const lineRaw of block.split("\n")) {
    const line = lineRaw.endsWith("\r") ? lineRaw.slice(0, -1) : lineRaw
    if (line === "" || line.startsWith(":")) continue

    const c = line.indexOf(":")
    const field = c === -1 ? line : line.slice(0, c)
    let value = c === -1 ? "" : line.slice(c + 1)
    if (value.startsWith(" ")) value = value.slice(1)

    if (field === "event") eventName = value
    else if (field === "data") dataLines.push(value)
    else if (field === "id") id = value
    else if (field === "retry") {
      const n = Number.parseInt(value, 10)
      if (Number.isFinite(n))
        retry = n
    }
  }

  if (!dataLines.length)
    return; // All messages MUST have data or they are ignored

  const raw = dataLines.join("\n")
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    data = raw
  }

  onEvent({event: eventName, data, id, retry})
}

/** Read a fetch `ReadableStream` as SSE, splitting on blank lines between events. */
export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: SseEventHandler,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  while (true) {
    const { done, value } = await reader.read()
    carry += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    let sep: number
    while ((sep = carry.indexOf('\n\n')) !== -1) {
      const block = carry.slice(0, sep)
      carry = carry.slice(sep + 2)
      dispatchSseBlock(block, onEvent)
    }
    if (done) break
  }
  const tail = carry.trim()
  if (tail) dispatchSseBlock(carry, onEvent)
}
