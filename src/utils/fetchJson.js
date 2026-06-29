export async function fetchJson(url, options = {}) {
    const response = await fetch(url, options)
    if (!response.ok) throw new Error('HTTP ' + response.status)

    const text = await response.text()
    return JSON.parse(text.replace(/^\uFEFF/, ''))
}
