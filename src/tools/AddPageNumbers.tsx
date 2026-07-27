import * as React from "react"
import { ArrowLeft, FileUp, Loader2, Download, CheckCircle, FileText, FileDigit } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export function AddPageNumbers({ onBack }: { onBack: () => void }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [dragged, setDragged] = React.useState(false)
  const [isDone, setIsDone] = React.useState(false)
  const [outputBytes, setOutputBytes] = React.useState<Uint8Array | null>(null)
  
  // Customization
  const [position, setPosition] = React.useState<"bottom-center" | "bottom-right" | "top-center">("bottom-center")
  const [startNumber, setStartNumber] = React.useState<number>(1)
  const [fontSize, setFontSize] = React.useState<number>(10)
  
  const { toast } = useToast()

  const handleFileChange = (newFile: File) => {
    setFile(newFile)
    setIsDone(false)
    setOutputBytes(null)
  }

  const handleAddNumbers = async () => {
    if (!file) return
    setIsProcessing(true)

    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer())
      const pdfDoc = await PDFDocument.load(fileBytes)
      
      const pages = pdfDoc.getPages()
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      
      pages.forEach((page, idx) => {
        const { width, height } = page.getSize()
        const text = String(idx + startNumber)
        const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize)
        
        let x = width / 2 - textWidth / 2
        let y = 20
        
        if (position === "bottom-right") {
          x = width - textWidth - 30
        } else if (position === "top-center") {
          x = width / 2 - textWidth / 2
          y = height - 30
        }
        
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0.2, 0.2, 0.2)
        })
      })

      const modifiedBytes = await pdfDoc.save()
      setOutputBytes(modifiedBytes)
      setIsDone(true)

      toast({
        title: "Page Numbers Added",
        description: "Successfully added page numbers to the document.",
        variant: "success"
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Process Failed",
        description: "An error occurred while adding page numbers.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (!outputBytes || !file) return
    const blob = new Blob([outputBytes] as any, { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name
    link.download = `${baseName}_numbered.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 py-8 px-6 md:px-12 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-850 text-cyan-500">
            <FileDigit className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 m-0">
              Add Page Numbers
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Add customizable page numbers to your PDF document client-side.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                Drag & drop PDF document here
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[240px] mx-auto">
                Select PDF to stamp page numbers.
              </p>
              <div className="relative mt-6">
                <input
                  type="file"
                  accept="application/pdf"
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
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[280px]">
                      {file.name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setFile(null)
                    setIsDone(false)
                    setOutputBytes(null)
                  }}
                  variant="ghost"
                  className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer text-xs font-bold"
                >
                  Change File
                </Button>
              </div>

              {isDone ? (
                <div className="flex flex-col items-center justify-center p-8 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-center">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mb-3" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Page Numbers Stamped Successfully!
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    Numbered document is ready for download.
                  </p>
                  <Button
                    onClick={downloadResult}
                    className="mt-6 cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Numbered PDF
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-5 max-w-md mx-auto w-full py-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Page Number Position
                    </label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value as any)}
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    >
                      <option value="bottom-center" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">Bottom Center</option>
                      <option value="bottom-right" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">Bottom Right</option>
                      <option value="top-center" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">Top Center</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Start Numbering From
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={startNumber}
                        onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                        className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Font Size
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="24"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value) || 10)}
                        className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleAddNumbers}
                    disabled={isProcessing}
                    className="mt-4 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      "Apply Page Numbers"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side info panel */}
        <div>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
              Tool Details
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Adds simple, clean Helvetica text identifiers showing sequence index markers directly onto each embedded PDF page layout dynamically in your web browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
