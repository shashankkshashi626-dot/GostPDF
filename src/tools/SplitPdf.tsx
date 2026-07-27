import * as React from "react"
import { FileUp, Trash2, ArrowLeft, Loader2, Download, AlertCircle, FileText } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument } from "pdf-lib"

export function SplitPdf({ onBack }: { onBack: () => void }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [totalPages, setTotalPages] = React.useState<number | null>(null)
  const [range, setRange] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [dragged, setDragged] = React.useState(false)
  const { toast } = useToast()

  // Format file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  // Load PDF and verify page count
  const handleFileChange = async (newFile: File) => {
    if (newFile.type !== "application/pdf" && !newFile.name.endsWith(".pdf")) {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive"
      })
      return
    }

    try {
      const arrayBuffer = await newFile.arrayBuffer()
      const pdf = await PDFDocument.load(arrayBuffer)
      setFile(newFile)
      setTotalPages(pdf.getPageCount())
      setRange(`1-${Math.min(pdf.getPageCount(), 5)}`) // Auto fill default range
      toast({
        title: "File loaded",
        description: `"${newFile.name}" contains ${pdf.getPageCount()} pages.`,
        variant: "success"
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Load failed",
        description: "Could not open this PDF. It may be password protected or corrupted.",
        variant: "destructive"
      })
    }
  }

  const parsePageRanges = (rangeStr: string, total: number): number[] => {
    const pages = new Set<number>()
    const parts = rangeStr.split(",")
    
    for (let part of parts) {
      part = part.trim()
      if (!part) continue

      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-")
        let start = startStr ? parseInt(startStr.trim(), 10) : 1
        let end = endStr ? parseInt(endStr.trim(), 10) : total
        
        if (isNaN(start) || start < 1) start = 1
        if (isNaN(end) || end > total) end = total
        
        if (start > end) {
          // Swap if start is larger
          const temp = start
          start = end
          end = temp
        }

        for (let i = start; i <= end; i++) {
          pages.add(i - 1) // 0-indexed internally
        }
      } else {
        const val = parseInt(part.trim(), 10)
        if (!isNaN(val) && val >= 1 && val <= total) {
          pages.add(val - 1)
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b)
  }

  const executeSplit = async () => {
    if (!file || totalPages === null) return
    if (!range.trim()) {
      toast({
        title: "Missing range",
        description: "Please specify which pages to extract.",
        variant: "destructive"
      })
      return
    }

    const pagesToExtract = parsePageRanges(range, totalPages)
    if (pagesToExtract.length === 0) {
      toast({
        title: "Invalid page range",
        description: `Please enter a valid page range between 1 and ${totalPages}.`,
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      const fileBytes = await file.arrayBuffer()
      const srcPdf = await PDFDocument.load(fileBytes)
      
      // Create a brand new document
      const splitPdf = await PDFDocument.create()
      
      // Copy pages
      const copiedPages = await splitPdf.copyPages(srcPdf, pagesToExtract)
      copiedPages.forEach((page) => splitPdf.addPage(page))

      // Save
      const splitBytes = await splitPdf.save()

      // Local download
      const blob = new Blob([splitBytes] as any, { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${file.name.replace(".pdf", "")}_extracted.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => URL.revokeObjectURL(url), 100)

      toast({
        title: "Extraction successful!",
        description: `Extracted ${pagesToExtract.length} pages.`,
        variant: "success"
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Split failed",
        description: "An error occurred during extraction.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-zinc-400 hover:text-zinc-200 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 m-0">Split PDF</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Extract specific page ranges into a new PDF document.</p>
          </div>
        </div>
      </div>

      {!file ? (
        /* Upload Area */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragged(true); }}
          onDragLeave={() => setDragged(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragged(false)
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFileChange(e.dataTransfer.files[0])
            }
          }}
          onClick={() => document.getElementById("split-file-input")?.click()}
          className={`w-full py-16 px-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
            dragged 
              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10" 
              : "border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700"
          }`}
        >
          <input
            type="file"
            id="split-file-input"
            accept=".pdf"
            onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
            className="hidden"
          />
          <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800">
            <FileUp className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Drag & drop your PDF file here, or click to browse
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Select a single PDF file (100% locally processed)
            </p>
          </div>
        </div>
      ) : (
        /* Form Page */
        <div className="flex flex-col gap-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-200/40 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-zinc-300/50 dark:bg-zinc-800 rounded shrink-0">
                <FileText className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate pr-2">
                  {file.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {formatBytes(file.size)} • {totalPages} pages
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFile(null)
                setTotalPages(null)
                setRange("")
              }}
              className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="range-input" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Pages to Extract
            </label>
            <input
              id="range-input"
              type="text"
              placeholder="e.g. 1-3, 5, 8-10"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-11 px-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium text-zinc-800 dark:text-zinc-100"
            />
            <div className="flex gap-2 p-3 bg-zinc-200/20 dark:bg-zinc-800/20 rounded-lg text-xs text-zinc-500 dark:text-zinc-400 mt-1 border border-zinc-300/30 dark:border-zinc-800/30">
              <AlertCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              <div>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Supported Syntax:</span> Use commas for separate pages and dashes for ranges.
                <br />
                For example, <code className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5">1-3, 5, 8</code> will extract pages 1, 2, 3, 5, and 8.
              </div>
            </div>
          </div>

          <Button
            onClick={executeSplit}
            disabled={isProcessing}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-zinc-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-semibold shadow-lg rounded-xl flex items-center justify-center gap-2 mt-4"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Extracting Pages...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Extract and Download PDF
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
