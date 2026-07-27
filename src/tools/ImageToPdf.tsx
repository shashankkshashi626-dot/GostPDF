import * as React from "react"
import { ArrowLeft, X, FileImage, Download, Loader2, ImagePlus, Layers, Files, GripVertical, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument } from "pdf-lib"

interface ImageToPdfProps {
  onBack: () => void
}

interface ImageEntry {
  id: string
  file: File
  previewUrl: string
  name: string
  size: number
}

type MergeMode = "merged" | "separate"

export function ImageToPdf({ onBack }: ImageToPdfProps) {
  const { toast } = useToast()
  const [images, setImages] = React.useState<ImageEntry[]>([])
  const [mergeMode, setMergeMode] = React.useState<MergeMode>("merged")
  const [processing, setProcessing] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"]

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    const valid = arr.filter(f => ACCEPTED_TYPES.includes(f.type))
    const invalid = arr.length - valid.length
    if (invalid > 0) {
      toast({ title: "Unsupported format", description: `${invalid} file(s) skipped. Supported: JPG, PNG, WEBP, GIF, BMP.`, variant: "destructive" })
    }
    if (valid.length === 0) return
    const entries: ImageEntry[] = valid.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
    }))
    setImages(prev => [...prev, ...entries])
    setDone(false)
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) URL.revokeObjectURL(img.previewUrl)
      return prev.filter(i => i.id !== id)
    })
    setDone(false)
  }

  const clearAll = () => {
    images.forEach(i => URL.revokeObjectURL(i.previewUrl))
    setImages([])
    setDone(false)
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = "move"
  }
  const handleDragEnterCard = (id: string) => setDragOverId(id)
  const handleDragEndCard = () => { setDraggingId(null); setDragOverId(null) }
  const handleDropCard = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) return
    setImages(prev => {
      const arr = [...prev]
      const fromIdx = arr.findIndex(i => i.id === draggingId)
      const toIdx = arr.findIndex(i => i.id === targetId)
      const [item] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, item)
      return arr
    })
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = url
    })

  const imageFileToJpegBytes = async (entry: ImageEntry): Promise<Uint8Array> => {
    const img = await loadImage(entry.previewUrl)
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), "image/jpeg", 0.95))
    return new Uint8Array(await blob.arrayBuffer())
  }

  const triggerDownload = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes] as any, { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleConvert = async () => {
    if (images.length === 0) return
    setProcessing(true)
    setDone(false)
    try {
      if (mergeMode === "merged") {
        const pdf = await PDFDocument.create()
        for (const entry of images) {
          const jpgBytes = await imageFileToJpegBytes(entry)
          const img = await pdf.embedJpg(jpgBytes as any)
          const page = pdf.addPage([img.width, img.height])
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
        }
        const bytes = await pdf.save()
        triggerDownload(bytes as any, "images_merged.pdf")
        toast({ title: "Done!", description: `${images.length} image(s) merged into one PDF.` })
      } else {
        for (let i = 0; i < images.length; i++) {
          const entry = images[i]
          const jpgBytes = await imageFileToJpegBytes(entry)
          const pdf = await PDFDocument.create()
          const img = await pdf.embedJpg(jpgBytes as any)
          const page = pdf.addPage([img.width, img.height])
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
          const bytes = await pdf.save()
          const baseName = entry.name.substring(0, entry.name.lastIndexOf(".")) || entry.name
          triggerDownload(bytes as any, `${baseName}.pdf`)
          await new Promise(r => setTimeout(r, 350))
        }
        toast({ title: "Done!", description: `${images.length} individual PDF(s) downloaded.` })
      }
      setDone(true)
    } catch (err) {
      console.error(err)
      toast({ title: "Conversion failed", description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(2)} MB`
  }

  return (
    <div className="flex-1 py-8 px-6 md:px-12 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <FileImage className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 leading-tight">Image to PDF</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Convert multiple images — 100% local, no upload needed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Drop Zone + Image List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropZone}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 cursor-pointer transition-all duration-200 ${
              dragOver
                ? "border-emerald-500 bg-emerald-500/5"
                : "border-zinc-300 dark:border-zinc-700 hover:border-emerald-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
            }`}
          >
            <div className="h-14 w-14 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 flex items-center justify-center">
              <ImagePlus className="h-7 w-7 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Drop images here or click to browse</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">JPG · PNG · WEBP · GIF · BMP · TIFF — multiple files at once</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) { addFiles(e.target.files); e.target.value = "" } }}
            />
          </div>

          {/* Image List */}
          {images.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {images.length} image{images.length !== 1 ? "s" : ""}
                  <span className="ml-2 text-xs font-normal text-zinc-400">— drag to reorder</span>
                </span>
                <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer transition-colors">
                  Clear all
                </button>
              </div>

              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={e => handleDragStart(e, img.id)}
                  onDragEnter={() => handleDragEnterCard(img.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDropCard(e, img.id)}
                  onDragEnd={handleDragEndCard}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                    draggingId === img.id
                      ? "opacity-40 scale-95"
                      : dragOverId === img.id && draggingId !== img.id
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40"
                  }`}
                >
                  <div className="cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-600 shrink-0">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-zinc-400 w-5 shrink-0 text-center">{idx + 1}</span>
                  <div className="h-14 w-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-100 dark:bg-zinc-800">
                    <img src={img.previewUrl} alt={img.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{img.name}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatBytes(img.size)}</p>
                  </div>
                  <button
                    onClick={() => removeImage(img.id)}
                    className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Options + Convert */}
        <div className="flex flex-col gap-4">
          {/* Output Mode */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4">Output Mode</h2>

            <button
              onClick={() => setMergeMode("merged")}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all duration-150 mb-3 cursor-pointer text-left ${
                mergeMode === "merged"
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
              }`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${mergeMode === "merged" ? "bg-emerald-500/15" : "bg-zinc-200/60 dark:bg-zinc-800/60"}`}>
                <Layers className={`h-5 w-5 ${mergeMode === "merged" ? "text-emerald-500" : "text-zinc-500"}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${mergeMode === "merged" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                  Merge into one PDF
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">All images become pages in a single PDF</p>
              </div>
            </button>

            <button
              onClick={() => setMergeMode("separate")}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all duration-150 cursor-pointer text-left ${
                mergeMode === "separate"
                  ? "border-blue-500 bg-blue-500/5"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
              }`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${mergeMode === "separate" ? "bg-blue-500/15" : "bg-zinc-200/60 dark:bg-zinc-800/60"}`}>
                <Files className={`h-5 w-5 ${mergeMode === "separate" ? "text-blue-500" : "text-zinc-500"}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${mergeMode === "separate" ? "text-blue-600 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                  Separate PDFs
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Each image downloads as its own PDF</p>
              </div>
            </button>
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3">Summary</h2>
            <div className="flex flex-col gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Images</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{images.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Output files</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {images.length === 0 ? "—" : mergeMode === "merged" ? "1 PDF" : `${images.length} PDF${images.length > 1 ? "s" : ""}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Processing</span>
                <span className="font-semibold text-emerald-500">100% Local</span>
              </div>
            </div>
          </div>

          {/* Convert Button */}
          <Button
            onClick={handleConvert}
            disabled={images.length === 0 || processing}
            className={`w-full h-12 text-sm font-bold gap-2 rounded-xl cursor-pointer border-none shadow-md transition-all ${
              done
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {processing ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Converting...</>
            ) : done ? (
              <><CheckCircle className="h-4 w-4" />Done! Convert More?</>
            ) : (
              <><Download className="h-4 w-4" />{mergeMode === "merged" ? "Convert & Merge PDF" : "Convert to Separate PDFs"}</>
            )}
          </Button>

          {images.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 px-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Add at least one image to begin
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
