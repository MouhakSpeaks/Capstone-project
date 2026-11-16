import { api } from './support/api.js'

// Fails fast with a readable message when the application under test is not running.
export default async function globalSetup() {
  const ui = process.env.UI_URL || 'http://localhost:3000'
  const problems = []

  try {
    const r = await fetch(ui)
    if (!r.ok) problems.push(`UI ${ui} answered ${r.status}`)
  } catch {
    problems.push(`UI not reachable at ${ui}  (start it with: cd ebookstore-ui && npm run dev)`)
  }

  try {
    const books = await api.call('GET', '/products', { params: { size: 1 } })
    if (books.status !== 200) problems.push(`API /products answered ${books.status}`)
    else if (!books.body?.data?.totalElements) problems.push('Catalogue is empty. Start the backend once so DataSeeder can insert sample data.')
    await api.adminToken()
  } catch (e) {
    problems.push(`API not usable: ${e.message}  (start it with: cd ebookstore && mvn spring-boot:run)`)
  }

  if (problems.length) {
    throw new Error('\nPre-flight check failed:\n  - ' + problems.join('\n  - ') + '\n')
  }
}
