'use client'

import type React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type TellerMarkdownProps = {
  content: string
  compact?: boolean
}

function normalizeTellerMarkdown(text: string) {
  const lines = text.split('\n')
  const normalized: string[] = []
  let previousKey = ''
  let previousWasBlank = false

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]
    let line = rawLine.replace(/^\s*>+\s?/, '').replace(/\s+$/, '')
    if (/^\s{2,}(?![-*+]|\d+\.)\S/.test(rawLine)) {
      line = `- ${rawLine.trim()}`
    }
    const nextNonBlank = lines.slice(index + 1).find((candidate) => candidate.trim())
    const nextLooksLikeList = Boolean(nextNonBlank && /^\s*([-*+]|\d+\.)\s+/.test(nextNonBlank))
    if (
      nextLooksLikeList
      && !/^\s*(#{1,6}\s|[-*+]|\d+\.)/.test(line)
      && (line.endsWith(':') || line.split(/\s+/).length <= 14)
    ) {
      const label = line.replace(/:\s*$/, '').trim()
      if (label) {
        line = `### ${label}`
      }
    }
    const key = line.trim().replace(/\s+/g, ' ').toLowerCase()

    if (!key) {
      if (!previousWasBlank && normalized.length) {
        normalized.push('')
      }
      previousWasBlank = true
      continue
    }

    if (key === previousKey) {
      continue
    }

    normalized.push(line)
    previousKey = key
    previousWasBlank = false
  }

  return normalized.join('\n')
}

export default function TellerMarkdown({ content, compact = false }: TellerMarkdownProps) {
  const baseFontSize = compact ? 12 : 14
  const headingGap = compact ? '8px 0 5px' : '10px 0 6px'
  const paragraphMargin = compact ? '4px 0' : '6px 0'
  const listMargin = compact ? '4px 0 4px 18px' : '6px 0 6px 20px'

  return (
    <div
      className={compact ? 'teller-markdown teller-markdown-compact' : 'teller-markdown'}
      data-testid={compact ? 'teller-markdown-compact' : 'teller-markdown'}
      style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ node: _node, ...props }) => (
            <h2
              className="teller-markdown-heading teller-markdown-h2"
              style={{ fontSize: compact ? 13 : 16, fontWeight: 700, margin: headingGap }}
              {...props}
            />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3
              className="teller-markdown-heading teller-markdown-h3"
              style={{ fontSize: compact ? 12 : 14, fontWeight: 700, margin: compact ? '6px 0 4px' : '8px 0 6px' }}
              {...props}
            />
          ),
          p: ({ node: _node, ...props }) => (
            <p
              className="teller-markdown-paragraph"
              style={{ margin: paragraphMargin, lineHeight: 1.6, padding: 0, textIndent: 0, fontSize: baseFontSize }}
              {...props}
            />
          ),
          ul: ({ node: _node, ...props }) => (
            <ul
              className="teller-markdown-list teller-markdown-ul"
              style={{ margin: listMargin, paddingLeft: compact ? 16 : 18, listStylePosition: 'outside', listStyleType: 'disc' }}
              {...props}
            />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol
              className="teller-markdown-list teller-markdown-ol"
              style={{ margin: listMargin, paddingLeft: compact ? 18 : 20, listStylePosition: 'outside', listStyleType: 'decimal' }}
              {...props}
            />
          ),
          li: ({ node: _node, ...props }) => (
            <li
              className="teller-markdown-list-item"
              style={{ marginBottom: compact ? 3 : 4, marginLeft: 0, paddingLeft: 0, fontSize: baseFontSize }}
              {...props}
            />
          ),
          strong: ({ node: _node, ...props }) => (
            <strong className="teller-markdown-strong" style={{ fontWeight: 700 }} {...props} />
          ),
          em: ({ node: _node, ...props }) => (
            <em className="teller-markdown-em" style={{ fontStyle: 'italic', color: '#5f4a3e' }} {...props} />
          ),
          a: ({ node: _node, ...props }) => (
            <a
              className="teller-markdown-link"
              style={{ color: '#8b513f', textDecoration: 'underline', textUnderlineOffset: 2 }}
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          code: ({ node: _node, ...props }) => (
            <code
              className="teller-markdown-code"
              style={{
                fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
                background: 'rgba(95, 74, 62, 0.08)',
                borderRadius: 6,
                padding: compact ? '1px 4px' : '2px 5px',
                fontSize: compact ? 11 : 12,
              }}
              {...props}
            />
          ),
          pre: ({ node: _node, ...props }) => (
            <pre
              className="teller-markdown-pre"
              style={{
                margin: paragraphMargin,
                padding: compact ? 8 : 10,
                borderRadius: 10,
                background: 'rgba(95, 74, 62, 0.08)',
                overflowX: 'auto',
              }}
              {...props}
            />
          ),
        }}
      >
        {normalizeTellerMarkdown(content)}
      </ReactMarkdown>
    </div>
  )
}
