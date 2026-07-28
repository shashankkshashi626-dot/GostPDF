import * as React from "react"
import { FileUp, Trash2, ArrowLeft, GripVertical, FileSpreadsheet, Loader2, Download } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument } from "pdf-lib"

interface MergeFile {
  id: string
  file: File
  name: string
  size: string
}

export function MergePdf({ onBack, isProUser, onRequirePro }: { onBack: () => void; isProUser?: boolean; onRequirePro?: () => void }) {
  const [files, setFiles] = React.useState<MergeFile[]>([])
  const [isMerging, setIsMerging] = React.useState(false)
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [isDraggingOver, setIsDraggingOver] = React.useState(false)
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

  // Handle file addition
  const handleFiles = (newFiles: FileList) => {
    const pdfs: MergeFile[] = []
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // Enforce 10MB size limit for Free users
        if (!isProUser && file.size > 10 * 1024 * 1024) {
          toast({
            title: "⚠️ Free Limit: 10 MB Max per File",
            description: `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Upgrade to GhostPDF Pro for Unlimited File Sizes! 👑`,
            variant: "destructive"
          })
          if (onRequirePro) onRequirePro()
          continue
        }

        // Enforce 3 files max for Free users
        if (!isProUser && files.length + pdfs.length >= 3) {
          toast({
            title: "⚠️ Free Limit: 3 Files Max Batch",
            description: "Free version allows max 3 files. Upgrade to GhostPDF Pro for Unlimited Batching! 👑",
            variant: "destructive"
          })
          if (onRequirePro) onRequirePro()
          break
        }

        pdfs.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: formatBytes(file.size)
        })
      } else {
        toast({
          title: "Invalid file type",
          description: `Skipped "${file.name}" because it is not a PDF.`,
          variant: "destructive"
        })
      }
    }

    if (pdfs.length > 0) {
      setFiles((prev) => [...prev, ...pdfs])
      toast({
        title: "Files added",
        description: `Successfully added ${pdfs.length} PDF file(s).`,
        variant: "success"
      })
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const onDragLeave = () => {
    setIsDraggingOver(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    toast({
      title: "File removed",
      description: "PDF removed from the merge list.",
    })
  }

  // Reorder dragging handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    // Use a clean drag preview if needed
  }

  const handleDragEnter = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return
    const updatedFiles = [...files]
    const draggedItem = updatedFiles[draggedIndex]
    updatedFiles.splice(draggedIndex, 1)
    updatedFiles.splice(targetIndex, 0, draggedItem)
    setDraggedIndex(targetIndex)
    setFiles(updatedFiles)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // PDF Merge Execution
  const mergePdfs = async () => {
    if (files.length < 2) {
      toast({
        title: "Requires more files",
        description: "Please select at least 2 PDF files to merge.",
        variant: "destructive"
      })
      return
    }

    setIsMerging(true)
    try {
      // Create a new PDF document
      const mergedPdf = await PDFDocument.create()

      for (const item of files) {
        // Read file into ArrayBuffer
        const fileBytes = await item.file.arrayBuffer()
        const srcPdf = await PDFDocument.load(fileBytes)
        
        // Copy all pages from srcPdf to mergedPdf
        const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      }

      // Save the merged PDF bytes
      const mergedPdfBytes = await mergedPdf.save()

      // Create a local download link
      const blob = new Blob([mergedPdfBytes] as any, { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement("a")
      link.href = url
      link.download = `merged_${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Cleanup object URL
      setTimeout(() => URL.revokeObjectURL(url), 100)

      toast({
        title: "Merge successful!",
        description: "Your merged PDF has been downloaded successfully.",
        variant: "success"
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Merging failed",
        description: "An error occurred while merging your PDF files. Please ensure they are not corrupted.",
        variant: "destructive"
      })
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-zinc-400 hover:text-zinc-200 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 m-0">Merge PDF</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Combine multiple PDF files into a single document client-side.</p>
          </div>
        </div>
        
        {files.length >= 2 && (
          <Button 
            onClick={mergePdfs} 
            disabled={isMerging}
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-medium shadow-lg dark:text-zinc-50 flex gap-2 items-center"
          >
            {isMerging ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Merge PDFs
              </>
            )}
          </Button>
        )}
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full py-12 px-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${
          isDraggingOver 
            ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10" 
            : "border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700"
        }`}
        onClick={() => document.getElementById("merge-file-input")?.click()}
      >
        <input
          type="file"
          id="merge-file-input"
          multiple
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800">
          <FileUp className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Drag & drop PDF files here, or click to browse
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Accepts multiple PDF files (100% locally processed)
          </p>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
              Merge List ({files.length} {files.length === 1 ? "File" : "Files"})
            </h2>
            {files.length > 1 && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                💡 Drag items by the handle to reorder
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            {files.map((file, index) => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all ${
                  draggedIndex === index ? "opacity-40 border-emerald-500 bg-emerald-500/5" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 shrink-0">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="p-2 bg-zinc-200/50 dark:bg-zinc-800 rounded shrink-0">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate pr-2">
                      {file.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {file.size}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                    Page {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(file.id)
                    }}
                    className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
