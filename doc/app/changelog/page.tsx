"use client"

import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"

export default function Changelog() {
  const [md, setMd] = useState("")

  useEffect(() => {
    // fetch("https://raw.githubusercontent.com/tradalab/redishub/main/CHANGELOG.md")
    fetch("https://raw.githubusercontent.com/tradalab/redishub/refs/heads/doc/upgrade/CHANGELOG.md")
      .then(res => res.text())
      .then(setMd)
  }, [])

  return (
    <div className="mdx prose prose-slate dark:prose-invert max-w-3xl mx-auto p-6">
      <ReactMarkdown>{md}</ReactMarkdown>
    </div>
  )
}
