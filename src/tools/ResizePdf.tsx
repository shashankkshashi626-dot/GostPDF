import * as React from "react"
import { FileUp, Trash2, ArrowLeft, Loader2, Download, FileText, Settings } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument } from "pdf-lib"

export function ResizePdf({ onBack }: { onBack: () => void }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [totalPages, setTotalPages] = React.useState<number | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [dragged, setDragged] = React.useState(false)
  const [resizeMode, setResizeMode] = React.useState<"preset" | "scale">("preset")
  const [pageSizePreset, setPageSizePreset] = React.useState<"a4" | "letter" | "a3" | "a5">("a4")
  const [scaleFactor, setScaleFactor] = React.useState<number>(1.25)
  const { toast } = useToast()

  const presets = {
    a4: { name: "A4 (595 x 842 pt)", width: 595, height: 842 },
    letter: { name: "Letter (612 x 792 pt)", width: 612, height: 792 },
    a3: { name: "A3 (842 x 1190 pt)", width: 842, height: 1190 },
    a5: { name: "A5 (420 x 595 pt)", width: 420, height: 595 }
  }

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

  const executeResize = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      const fileBytes = await file.arrayBuffer()
      const srcPdf = await PDFDocument.load(fileBytes)
      const resizedPdf = await PDFDocument.create()

      const srcPageCount = srcPdf.getPageCount()
      const srcPages = srcPdf.getPages()

      for (let i = 0; i < srcPageCount; i++) {
        const srcPage = srcPages[i]
        const { width: originalWidth, height: originalHeight } = srcPage.getSize()

        let targetWidth = originalWidth
        let targetHeight = originalHeight

        if (resizeMode === "preset") {
          const preset = presets[pageSizePreset]
          targetWidth = preset.width
          targetHeight = preset.height
        } else {
          targetWidth = originalWidth * scaleFactor
          targetHeight = originalHeight * scaleFactor
        }

        const newPage = resizedPdf.addPage([targetWidth, targetHeight])
        const [embeddedPage] = await resizedPdf.embedPages([srcPdf.getPages()[i]])

        if (resizeMode === "preset") {
          // Center and scale to fit target dimensions preserving aspect ratio
          const scale = Math.min(targetWidth / originalWidth, targetHeight / originalHeight)
          const x = (targetWidth - originalWidth * scale) / 2
          const y = (targetHeight - originalHeight * scale) / 2

          newPage.drawPage(embeddedPage, {
            x,
            y,
            width: originalWidth * scale,
            height: originalHeight * scale
          })
        } else {
          // Just scale directly
          newPage.drawPage(embeddedPage, {
            x: 0,
            y: 0,
            width: targetWidth,
            height: targetHeight
          })
        }
      }

      const resizedPdfBytes = await resizedPdf.save()
      
      // Trigger download
      const blob = new Blob([resizedPdfBytes] as any, { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name
      link.download = `${baseName}_resized.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Resize complete",
        description: "Your resized PDF has been downloaded successfully.",
        variant: "success"
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Resize failed",
        description: "An error occurred during resizing. Please check the file.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex-1 py-8 px-6 md:px-12 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-8">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 m-0">
            Resize PDF
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Change PDF page sizes to standard presets or custom scaling factors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragged(true)
              }}
              onDragLeave={() => setDragged(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragged(false)
                if (e.dataTransfer.files.length > 0) {
                  handleFileChange(e.dataTransfer.files[0])
                }
              }}
              className={`border-2 border-dashed rounded-xl p-10 text-center flex flex-col items-center justify-center min-h-[300px] transition-all ${
                dragged
                  ? "border-zinc-500 bg-zinc-100/50 dark:bg-zinc-900/50"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-650"
              }`}
            >
              <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 mb-4">
                <FileUp className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Drag & drop PDF here
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[200px] mx-auto">
                Support PDF documents up to 50MB.
              </p>
              <div className="relative mt-6">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileChange(e.target.files[0])
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button className="cursor-pointer">Browse Files</Button>
              </div>
            </div>
          ) : (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[280px]">
                      {file.name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatBytes(file.size)} • {totalPages} Pages
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setFile(null)
                    setTotalPages(null)
                  }}
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Configure resizing settings */}
              <div className="mt-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Resize Method
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setResizeMode("preset")}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        resizeMode === "preset"
                          ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-50"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      Standard Presets
                    </button>
                    <button
                      onClick={() => setResizeMode("scale")}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        resizeMode === "scale"
                          ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-50"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      Custom Scaling
                    </button>
                  </div>
                </div>

                {resizeMode === "preset" ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Target Page Size Preset
                    </label>
                    <select
                      value={pageSizePreset}
                      onChange={(e) => setPageSizePreset(e.target.value as any)}
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    >
                      <option value="a4" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">A4 (595 x 842 pt)</option>
                      <option value="letter" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">US Letter (612 x 792 pt)</option>
                      <option value="a3" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">A3 (842 x 1190 pt)</option>
                      <option value="a5" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">A5 (420 x 595 pt)</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Scale Factor
                      </label>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {scaleFactor.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="3.00"
                      step="0.05"
                      value={scaleFactor}
                      onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-50"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                      <span>0.25x (Shrink)</span>
                      <span>1.0x (Normal)</span>
                      <span>3.0x (Enlarge)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
              <Settings className="h-4.5 w-4.5 text-zinc-500" />
              <span className="text-xs font-bold">Resize Summary</span>
            </div>
            
            <div className="flex flex-col gap-2.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <div className="flex justify-between">
                <span>Selected Preset:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  {resizeMode === "preset" ? presets[pageSizePreset].name : "Custom Scale"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Output Format:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">PDF Document</span>
              </div>
            </div>

            <Button
              onClick={executeResize}
              disabled={!file || isProcessing}
              className="w-full mt-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Resizing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Resize & Download
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
