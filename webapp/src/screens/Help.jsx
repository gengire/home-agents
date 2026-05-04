import { useState, lazy, Suspense } from "react"
import { RefreshCw } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import mobileGuide from "../../../docs/mobile-guide.md?raw"
import desktopGuide from "../../../docs/desktop-guide.md?raw"
import githubGuide from "../../../docs/github-integration.md?raw"

const TABS = [
  { id: "mobile", label: "📱 Mobile", content: mobileGuide },
  { id: "desktop", label: "💻 Desktop", content: desktopGuide },
  { id: "github", label: "🔗 GitHub", content: githubGuide },
]

const MARKDOWN_COMPONENTS = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-3 leading-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-gray-800 mt-6 mb-2 pb-1 border-b border-gray-200">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-gray-700 mt-4 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-gray-700 mt-3 mb-1">{children}</h4>,
  p: ({ children }) => <p className="text-sm text-gray-700 mb-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1 text-sm text-gray-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1 text-sm text-gray-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ inline, children }) =>
    inline
      ? <code className="bg-gray-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
      : <code className="block bg-gray-900 text-green-300 p-4 rounded-xl text-xs font-mono overflow-x-auto mb-3 whitespace-pre">{children}</code>,
  pre: ({ children }) => <div className="mb-3">{children}</div>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-green-400 pl-4 my-3 text-sm text-gray-600 italic bg-green-50 py-2 rounded-r-lg">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-600 underline hover:text-green-800">{children}</a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-xs border-collapse border border-gray-200 rounded-lg overflow-hidden">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-gray-700 border border-gray-200">{children}</td>,
  tr: ({ children }) => <tr className="even:bg-gray-50">{children}</tr>,
  hr: () => <hr className="my-5 border-gray-200" />,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
}

export default function Help() {
  const [activeTab, setActiveTab] = useState("mobile")
  const active = TABS.find(t => t.id === activeTab)

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-green-500 text-green-700 bg-green-50"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Guide content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pb-32 pt-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {active.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
