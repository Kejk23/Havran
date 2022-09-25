import React, {FunctionComponent} from 'react'
import ReactMarkdown from 'react-markdown'
import {CodeComponent} from 'react-markdown/lib/ast-to-react'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'

interface Props {
  source: string
}
const renderers: {code: CodeComponent} = {
  code: ({inline, children, className}) => {
    if (inline) {
      return <code>{children}</code>
    } else {
      const language =
        className && className.startsWith('language-')
          ? className.substring('language-'.length)
          : className
      return (
        <SyntaxHighlighter language={language}>{children}</SyntaxHighlighter>
      )
    }
  },
}

const Markdown: FunctionComponent<Props> = ({source}) => {
  return <ReactMarkdown components={renderers}>{source}</ReactMarkdown>
}

export default Markdown
