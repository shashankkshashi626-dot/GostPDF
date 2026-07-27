import * as React from "react"
import { FileUp, Trash2, ArrowLeft, Loader2, Download, RotateCw } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument, degrees } from "pdf-lib"
import * as pdfjsLib from "pdfjs-dist"

// Set CDN worker path for pdfjs-dist v4.4.168
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`

interface PageState {
  id: string
  originalIndex: number // 0-indexed
  rotation: number // 0, 90, 180, 270 degrees
  thumbnailUrl: string
}

export function OrganizePdf({ onBack }: { onBack: () => void }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [pages, setPages] = React.useState<PageState[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [dragged, setDragged] = React.useState(false)
  const [loadingProgress, setLoadingProgress] = React.useState(0)
  const { toast } = useToast()

  const handleFileChange = async (newFile: File) => {
    if (newFile.type !== "application/pdf" && !newFile.name.endsWith(".pdf")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid PDF file.",
        variant: "destructive"
      })
      return
    }

    setFile(newFile)
    setIsLoading(true)
    setLoadingProgress(0)
    setPages([])

    try {
      const arrayBuffer = await newFile.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      const numPages = pdf.numPages
      const loadedPages: PageState[] = []

      for (let i = 1; i <= numPages; i++) {
        setLoadingProgress(Math.round((i / numPages) * 100))
        
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.3 }) // Small thumbnail scale
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        
        if (context) {
          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise
          
          loadedPages.push({
            id: Math.random().toString(36).substring(2, 9),
            originalIndex: i - 1,
            rotation: 0,
            thumbnailUrl: canvas.toDataURL("image/webp", 0.7) // Render as compressed WebP for performance
          })
        }
      }

      setPages(loadedPages)
      toast({
        title: "PDF loaded",
        description: `Successfully loaded all ${numPages} page thumbnails.`,
        variant: "success"
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Load failed",
        description: "Failed to render PDF page previews. The file might be corrupted.",
        variant: "destructive"
      })
      setFile(null)
    } finally {
      setIsLoading(false)
    }
  }

  const rotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    )
  }

  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id))
    toast({
      title: "Page deleted",
      description: "Page removed from export document."
    })
  }

  const savePdf = async () => {
    if (!file || pages.length === 0) {
      toast({
        title: "No pages to save",
        description: "Please add a PDF file with at least one page.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const srcPdf = await PDFDocument.load(arrayBuffer)
      const exportPdf = await PDFDocument.create()

      for (const item of pages) {
        // Copy original page
        const [copiedPage] = await exportPdf.copyPages(srcPdf, [item.originalIndex])
        
        // Add rotation (retrieve the page's original rotation and append our offset)
        const baseRotation = copiedPage.getRotation().angle
        copiedPage.setRotation(degrees((baseRotation + item.rotation) % 360))
        
        exportPdf.addPage(copiedPage)
      }

      const pdfBytes = await exportPdf.save()
      const blob = new Blob([pdfBytes] as any, { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement("a")
      link.href = url
      link.download = `${file.name.replace(".pdf", "")}_organized.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => URL.revokeObjectURL(url), 100)

      toast({
        title: "Saved successfully!",
        description: "Your organized PDF has been downloaded.",
        variant: "success"
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Export failed",
        description: "An error occurred during save processing.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-zinc-400 hover:text-zinc-200 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 m-0">Organize & Rotate</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Reorder, delete, and rotate pages inside your document.</p>
          </div>
        </div>

        {pages.length > 0 && (
          <Button
            onClick={savePdf}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-medium shadow-lg flex gap-2 items-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        )}
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
          onClick={() => document.getElementById("organize-file-input")?.click()}
          className={`w-full py-16 px-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
            dragged 
              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10" 
              : "border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700"
          }`}
        >
          <input
            type="file"
            id="organize-file-input"
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
              Loads document pages visually (100% locally processed)
            </p>
          </div>
        </div>
      ) : isLoading ? (
        /* Loader and Progress */
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Rendering Page Previews...
            </p>
            <div className="w-48 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mx-auto">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300" 
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {loadingProgress}% Complete
            </p>
          </div>
        </div>
      ) : (
        /* Pages Grid */
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
              Document Pages ({pages.length} total)
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFile(null)
                setPages([])
              }}
              className="text-xs text-zinc-500 hover:text-red-500 cursor-pointer"
            >
              Clear File
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {pages.map((p, index) => (
              <div
                key={p.id}
                className="group relative flex flex-col items-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-emerald-500/50 transition-all duration-300"
              >
                {/* Visual Thumbnail wrapper to handle CSS rotation cleanly */}
                <div className="w-full aspect-[3/4] overflow-hidden flex items-center justify-center rounded bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800/80">
                  <img
                    src={p.thumbnailUrl}
                    alt={`Page ${index + 1}`}
                    className="max-w-full max-h-full object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                  />
                </div>

                {/* Hover overlay actions */}
                <div className="absolute inset-0 bg-zinc-950/80 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => rotatePage(p.id)}
                    className="h-10 w-10 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 cursor-pointer"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deletePage(p.id)}
                    className="h-10 w-10 cursor-pointer"
                    title="Delete Page"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <span className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Page {p.originalIndex + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
