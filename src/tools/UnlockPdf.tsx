import * as React from "react"
import { ArrowLeft, FileUp, Loader2, Download, CheckCircle, FileText, Lock, Unlock } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument } from "pdf-lib"
// @ts-ignore
import { decryptPDF } from "@pdfsmaller/pdf-decrypt"

export function UnlockPdf({ onBack }: { onBack: () => void }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [dragged, setDragged] = React.useState(false)
  const [needsPassword, setNeedsPassword] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [isDone, setIsDone] = React.useState(false)
  const [unlockedBytes, setUnlockedBytes] = React.useState<Uint8Array | null>(null)
  const { toast } = useToast()

  const handleFileChange = async (newFile: File) => {
    setFile(newFile)
    setIsDone(false)
    setUnlockedBytes(null)
    setPassword("")
    setNeedsPassword(false)

    try {
      // Test if PDF is encrypted / needs password
      const fileBytes = new Uint8Array(await newFile.arrayBuffer())
      await PDFDocument.load(fileBytes)
      
      // If load succeeds, PDF is not locked
      toast({
        title: "Already Unlocked",
        description: "This PDF does not require a password to view.",
        variant: "default"
      })
      setNeedsPassword(false)
    } catch (err: any) {
      // Typically errors out with password required message if encrypted
      console.log("PDF load test error:", err)
      setNeedsPassword(true)
      toast({
        title: "Password Protected",
        description: "This document is encrypted. Please enter the password to unlock it.",
        variant: "destructive"
      })
    }
  }

  const handleUnlock = async () => {
    if (!file) return
    setIsProcessing(true)

    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer())
      const decryptedBytes = await decryptPDF(fileBytes, password)
      
      // Test the output to confirm it decrypted correctly
      await PDFDocument.load(decryptedBytes)

      setUnlockedBytes(decryptedBytes)
      setIsDone(true)

      toast({
        title: "PDF Unlocked",
        description: "Successfully removed password security from the PDF.",
        variant: "success"
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Unlock Failed",
        description: "Incorrect password. Please verify and try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadUnlocked = () => {
    if (!unlockedBytes || !file) return
    const blob = new Blob([unlockedBytes] as any, { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name
    link.download = `${baseName}_unlocked.pdf`
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
          <span className="p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-850 text-amber-500">
            <Unlock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 m-0">
              Unlock PDF
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Remove passwords and unlock secured PDF documents client-side.
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
                Drag & drop password-protected PDF here
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-[240px] mx-auto">
                Decrypt and save your protected PDF file.
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
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Protected PDF Document
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setFile(null)
                    setIsDone(false)
                    setUnlockedBytes(null)
                    setNeedsPassword(false)
                    setPassword("")
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
                    PDF Decrypted Successfully!
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    Password security has been completely stripped from the document.
                  </p>
                  <Button
                    onClick={downloadUnlocked}
                    className="mt-6 cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Unlocked PDF
                  </Button>
                </div>
              ) : needsPassword ? (
                <div className="flex flex-col gap-4 max-w-md mx-auto w-full py-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Enter PDF Password
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="h-10 px-3 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUnlock()
                        }}
                      />
                      <Button
                        onClick={handleUnlock}
                        disabled={isProcessing || !password}
                        className="cursor-pointer"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Unlock"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mb-3" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    This PDF does not require a password
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    You can download a clean copy immediately or use other PDF tools.
                  </p>
                  <Button
                    onClick={() => {
                      const fileUrl = URL.createObjectURL(file)
                      const link = document.createElement("a")
                      link.href = fileUrl
                      link.download = file.name
                      link.click()
                      URL.revokeObjectURL(fileUrl)
                    }}
                    className="mt-6 cursor-pointer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Copy
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side info panel */}
        <div>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-zinc-500" />
              Local Encryption Info
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              GhostPDF unlocks protected files entirely in your browser using secure client-side cryptography. Your document credentials and content never reach any external server.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
