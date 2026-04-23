import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = '/Users/harpertheauthor/Billions/manifestBank/manifestbank-frontend'

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

test('My Credit page loads summary and todos', () => {
  const source = read('app/mycredit/page.tsx')
  assert.match(source, /api\.get\(`\/credit\/summary\?days=\$\{rangeDays\}`\)/)
  assert.match(source, /api\.get\('\/credit\/todos'\)/)
})

test('My Credit bureau page loads bureau detail and supports todo pinning', () => {
  const source = read('app/mycredit/[bureau]/page.tsx')
  assert.match(source, /\.get\(`\/credit\/bureau\/\$\{bureau\}\?days=\$\{rangeDays\}`\)/)
  assert.match(source, /api\.post\('\/credit\/todos', \{ action_id: actionId \}\)/)
  assert.match(source, /api\.delete\(`\/credit\/todos\/by-action\/\$\{actionId\}`\)/)
})

test('Credit report page loads the report endpoint', () => {
  const source = read('app/mycreditreport/page.tsx')
  assert.match(source, /\.get\('\/credit\/report'\)/)
  assert.match(source, /item\.points > 0 \? '\+' : ''/)
  assert.match(source, /item\.points < 0 \? '#9f3a33' : '#6b3b2c'/)
})

test('Dashboard wires dashboard currency updates and transfer preview rendering', () => {
  const source = read('app/dashboard/page.tsx')
  assert.match(source, /api\.patch\('\/users\/dashboard-currency'/)
  assert.match(source, /api\.post\('\/transfers\/preview'/)
  assert.match(source, /Preview:\s*\{transferPreview\.debit_amount\}/)
})

test('Navbar exposes split Login and Register links for logged-out users', () => {
  const source = read('app/components/Navbar.tsx')
  assert.match(source, /<Link href="\/auth"[^>]*>\s*Login\s*<\/Link>/)
  assert.match(source, /<Link href="\/auth\?mode=register"[^>]*>\s*Register\s*<\/Link>/)
  assert.match(source, /!isLoading && me \?/)
})

test('Auth page opens register mode from query string', () => {
  const source = read('app/auth/page.tsx')
  assert.match(source, /new URLSearchParams\(window\.location\.search\)\.get\('mode'\)/)
  assert.match(source, /setMode\(requestedMode === 'register' \? 'register' : 'login'\)/)
})
