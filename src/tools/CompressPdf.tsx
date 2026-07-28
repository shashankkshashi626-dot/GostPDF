import * as React from "react"
import { FileUp, Trash2, ArrowLeft, Loader2, AlertTriangle, FileCheck } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument } from "pdf-lib"
import * as pdfjsLib from "pdfjs-dist"

// Set CDN worker path for pdfjs-dist v4.4.168
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`

export function CompressPdf({ onBack, userTier = "free", onRequirePro }: { onBack: () => void; userTier?: "free" | "medium" | "pro"; onRequirePro?: () => void }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [quality, setQuality] = React.useState(0.6) // Default 60%
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [dragged, setDragged] = React.useState(false)
  const [compressedSize, setCompressedSize] = React.useState<string | null>(null)
  const { toast } = useToast()

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  const handleFileChange = (newFile: File) => {
    if (newFile.type !== "application/pdf" && !newFile.name.endsWith(".pdf")) {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive"
      })
      return
    }
    const maxMb = userTier === "pro" ? Infinity : userTier === "medium" ? 50 : 10
    if (newFile.size > maxMb * 1024 * 1024) {
      toast({
        title: `⚠️ ${userTier === "medium" ? "Medium Plan" : "Free Tier"} Limit: ${maxMb} MB Max`,
        description: `"${newFile.name}" is ${(newFile.size / (1024 * 1024)).toFixed(1)} MB. Upgrade to Pro for Unlimited File Sizes! 👑`,
        variant: "destructive"
      })
      if (onRequirePro) onRequirePro()
      return
    }
    setFile(newFile)
    setCompressedSize(null)
  }

  // Base64 helper to convert canvas to ArrayBuffer
  const dataURLToArrayBuffer = (dataURI: string): ArrayBuffer => {
    const byteString = atob(dataURI.split(",")[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return ab
  }

  const compressPdf = async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      const numPages = pdf.numPages
      
      const newPdfDoc = await PDFDocument.create()

      // Canvas Rendering Loop with asynchronous yielding
      for (let i = 1; i <= numPages; i++) {
        setProgress(Math.round(((i - 1) / numPages) * 100))
        
        // 1. Render page to canvas using pdfjs-dist
        const page = await pdf.getPage(i)
        
        // We use page viewport at scale 1.5 for high resolution rendering,
        // then compress it via Canvas quality factor to shrink file size.
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        
        if (context) {
          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise

          // 2. Compress image as JPEG using the quality factor
          const jpegDataUrl = canvas.toDataURL("image/jpeg", quality)
          const imgBuffer = dataURLToArrayBuffer(jpegDataUrl)

          // 3. Embed JPEG page into pdf-lib doc
          const embeddedImage = await newPdfDoc.embedJpg(imgBuffer)
          const newPage = newPdfDoc.addPage([embeddedImage.width, embeddedImage.height])
          newPage.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: embeddedImage.width,
            height: embeddedImage.height
          })
        }

        // 4. Asynchronous yielding: Pause slightly in each iteration
        // This yields CPU back to browser thread, maintaining a fluid loader UI
        await new Promise((resolve) => setTimeout(resolve, 30))
      }

      setProgress(100)

      // Save the flattened & compressed PDF
      const pdfBytes = await newPdfDoc.save()
      const finalBlob = new Blob([pdfBytes] as any, { type: "application/pdf" })
      
      setCompressedSize(formatBytes(finalBlob.size))
      
      // Trigger download
      const url = URL.createObjectURL(finalBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${file.name.replace(".pdf", "")}_compressed.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => URL.revokeObjectURL(url), 100)

      toast({
        title: "Compression complete",
        description: `Successfully compressed from ${formatBytes(file.size)} to ${formatBytes(finalBlob.size)}.`,
        variant: "success"
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Compression failed",
        description: "An error occurred while flattening and compressing document pages.",
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 m-0">Compress PDF</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Reduce PDF file sizes locally via offscreen canvas compression.</p>
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
          onClick={() => document.getElementById("compress-file-input")?.click()}
          className={`w-full py-16 px-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
            dragged 
              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10" 
              : "border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700"
          }`}
        >
          <input
            type="file"
            id="compress-file-input"
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
              Optimizes pages locally by converting to compact JPEGs
            </p>
          </div>
        </div>
      ) : isProcessing ? (
        /* Processing Indicator */
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Compressing PDF pages...
            </p>
            <div className="w-48 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mx-auto">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {progress}% Processed (UI is fully active)
            </p>
          </div>
        </div>
      ) : (
        /* Compress Configuration View */
        <div className="flex flex-col gap-6 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-200/40 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-zinc-300/50 dark:bg-zinc-800 rounded shrink-0">
                <FileCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate pr-2">
                  {file.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Original: {formatBytes(file.size)} {compressedSize && `| Compressed: ${compressedSize}`}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFile(null)}
              className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Quality Slider */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Compression Quality
              </span>
              <span className="text-sm font-bold text-emerald-500">
                {Math.round(quality * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-zinc-200 dark:bg-zinc-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>High Compression (Low Quality)</span>
              <span>Low Compression (High Quality)</span>
            </div>
          </div>

          {/* Warning Box */}
          <div className="flex gap-3 p-4 bg-amber-500/10 rounded-xl text-xs text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-bold text-sm block mb-1">Canvas Render Flattening</span>
              This compression method renders your pages into high-speed images. Text in the resulting PDF will be flattened and will **no longer be highlightable, searchable, or selectable**.
            </div>
          </div>

          <Button
            onClick={compressPdf}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-zinc-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-semibold shadow-lg rounded-xl flex items-center justify-center gap-2 mt-4"
          >
            Compress and Download
          </Button>
        </div>
      )}
    </div>
  )
}
