import * as React from "react"
import { ArrowLeft, FileUp, Loader2, Download, CheckCircle, FileText } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument } from "pdf-lib"

interface PlaceholderWorkspaceProps {
  toolId: string
  toolName: string
  toolIcon: React.ReactNode
  toolColor: string
  onBack: () => void
}

export function PlaceholderWorkspace({ toolId, toolName, toolIcon, toolColor, onBack }: PlaceholderWorkspaceProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isDone, setIsDone] = React.useState(false)
  const [dragged, setDragged] = React.useState(false)
  const { toast } = useToast()

  const handleFileChange = (newFile: File) => {
    setFile(newFile)
    setIsDone(false)
    toast({
      title: "File imported",
      description: `"${newFile.name}" has been prepared for local client-side processing.`,
      variant: "default"
    })
  }

  const runSimulation = () => {
    if (!file) return
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setIsDone(true)
      toast({
        title: "Process completed",
        description: `Successfully simulated client-side processing for ${toolName}.`,
        variant: "success"
      })
    }, 2000)
  }

  const getTargetExtension = () => {
    const originalExt = file ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase() : ".pdf"
    switch (toolId) {
      case "pdf2word":
        return ".docx"
      case "word2pdf":
      case "epub2pdf":
      case "img2pdf":
      case "jpg2pdf":
        return ".pdf"
      case "pdf2jpg":
      case "heic2jpg":
      case "png2jfif":
        return ".jpg"
      case "pdf2png":
      case "webp2png":
      case "jfif2png":
      case "svg2png":
        return ".png"
      case "pdf2epub":
        return ".epub"
      case "png2svg":
        return ".svg"
      case "png2webp":
        return ".webp"
      case "jpg2heic":
        return ".heic"
      default:
        return originalExt || ".pdf"
    }
  }

  const downloadSimulated = async () => {
    if (!file) return
    const extension = getTargetExtension()
    
    let blob: Blob | File = file
    if (extension === ".pdf") {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        blob = file
      } else {
        try {
          const dummyPdf = await PDFDocument.create()
          dummyPdf.addPage([595, 842])
          const dummyBytes = await dummyPdf.save()
          blob = new Blob([dummyBytes] as any, { type: "application/pdf" })
        } catch (e) {
          // Fallback to minimal valid PDF structure string
          blob = new Blob(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000120 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"], { type: "application/pdf" })
        }
      }
    } else {
      blob = new Blob(["Simulated content conversion output from GhostPDF client-side processing."], { type: "application/octet-stream" })
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name
    link.download = `${baseName}_${toolId}${extension}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
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
          <span className={`p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-850 ${toolColor}`}>
            {toolIcon}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 m-0">
              {toolName} Workspace
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Active local client-side processing module. No files are uploaded to any server.
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
                Drag & drop files here
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[240px] mx-auto">
                Select document or image to process inside this workspace.
              </p>
              <div className="relative mt-6">
                <input
                  type="file"
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
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatBytes(file.size)} • Local File
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setFile(null)
                    setIsDone(false)
                  }}
                  variant="ghost"
                  className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer text-xs font-bold"
                >
                  Clear File
                </Button>
              </div>

              {isDone ? (
                <div className="flex flex-col items-center justify-center p-8 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-center">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mb-3" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Processing Complete!
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    Simulated client-side document processing for {toolName} completed successfully.
                  </p>
                  <Button
                    onClick={downloadSimulated}
                    className="mt-6 cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Processed File
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border border-zinc-250/20 rounded-xl text-center">
                  <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                    Click "Process Document" below to begin simulated client-side parsing of your file with the {toolName} module.
                  </p>
                  <Button
                    onClick={runSimulation}
                    disabled={isProcessing}
                    className="mt-6 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Start Processing
                      </>
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
              GhostPDF operates strictly in your browser. When you run this feature, the document is parsed locally on your device without leaving your environment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
