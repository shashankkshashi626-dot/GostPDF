import * as React from "react"
import { PDFDocument } from "pdf-lib"
import {
  Camera, RefreshCw, Image as ImageIcon, Trash2, ArrowLeft,
  FileDown, Sparkles, AlertCircle, ShieldCheck, Plus
} from "lucide-react"
import { Button } from "../components/ui/button"

interface CameraScannerProps {
  onBack: () => void
  userTier?: "free" | "medium" | "pro"
}

export function CameraScanner({ onBack }: CameraScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [isCameraActive, setIsCameraActive] = React.useState(false)
  const [facingMode, setFacingMode] = React.useState<"environment" | "user">("environment")
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const [capturedPages, setCapturedPages] = React.useState<string[]>([])
  const [filterMode, setFilterMode] = React.useState<"original" | "magic" | "grayscale">("magic")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [flashAnimation, setFlashAnimation] = React.useState(false)

  // Start Camera Stream
  const startCamera = React.useCallback(async (mode: "environment" | "user" = facingMode) => {
    setErrorMsg(null)
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })

      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
      setIsCameraActive(true)
    } catch (err: any) {
      console.error("Camera access error:", err)
      setErrorMsg("Camera access denied or unavailable. Please grant camera permissions or use gallery import.")
      setIsCameraActive(false)
    }
  }, [facingMode, stream])

  // Stop Camera Stream
  const stopCamera = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraActive(false)
  }, [stream])

  // Toggle Camera Facing Mode (Front / Back)
  const toggleCamera = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment"
    setFacingMode(nextMode)
    await startCamera(nextMode)
  }

  React.useEffect(() => {
    startCamera("environment")
    return () => {
      stopCamera()
    }
  }, [])

  // Apply Document Scan Enhancements (B&W / Contrast / Grayscale)
  const applyFilterToCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number, mode: string) => {
    if (mode === "original") return

    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Grayscale intensity
      const gray = 0.299 * r + 0.587 * g + 0.114 * b

      if (mode === "grayscale") {
        data[i] = gray
        data[i + 1] = gray
        data[i + 2] = gray
      } else if (mode === "magic") {
        // High contrast document filter (B&W document scan look)
        const contrast = 1.3
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
        let enhanced = factor * (gray - 128) + 128

        // Thresholding for clean paper look
        if (enhanced > 190) enhanced = 255
        if (enhanced < 60) enhanced = 0

        data[i] = enhanced
        data[i + 1] = enhanced
        data[i + 2] = enhanced
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  // Snap Photo Frame
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    applyFilterToCanvas(ctx, canvas.width, canvas.height, filterMode)

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
    setCapturedPages(prev => [...prev, dataUrl])

    // Visual camera shutter flash effect
    setFlashAnimation(true)
    setTimeout(() => setFlashAnimation(false), 200)
  }

  // Handle Gallery Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new window.Image()
          img.onload = () => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            if (!ctx) return
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            applyFilterToCanvas(ctx, canvas.width, canvas.height, filterMode)
            const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
            setCapturedPages(prev => [...prev, dataUrl])
          }
          img.src = event.target.result as string
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // Remove Captured Page
  const removePage = (index: number) => {
    setCapturedPages(prev => prev.filter((_, i) => i !== index))
  }

  // Generate & Download PDF
  const convertToPdf = async () => {
    if (capturedPages.length === 0) return

    setIsProcessing(true)
    try {
      const pdfDoc = await PDFDocument.create()

      for (const pageDataUrl of capturedPages) {
        const imageBytes = await fetch(pageDataUrl).then(res => res.arrayBuffer())
        const image = await pdfDoc.embedJpg(imageBytes)

        const page = pdfDoc.addPage([image.width, image.height])
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height
        })
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = `Scanned_Document_${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("PDF generation failed:", err)
      setErrorMsg("Failed to generate PDF. Please try snapping photos again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex-1 py-4 sm:py-6 px-3 sm:px-6 md:px-12 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => { stopCamera(); onBack(); }}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Camera className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 m-0">
                Camera Document Scanner 📷
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Scan multi-page documents via mobile camera and convert directly to PDF
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 hidden sm:inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            100% Offline &amp; Private
          </span>
        </div>
      </div>

      {/* Camera Error Alert */}
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-bold bg-amber-500 text-white hover:bg-amber-600 border-none shrink-0"
          >
            Upload Gallery
          </Button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Camera Viewfinder Interface */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center">
            {/* Camera Shutter Flash Effect */}
            {flashAnimation && (
              <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200" />
            )}

            {/* Live Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isCameraActive ? "hidden" : "block"}`}
            />

            {/* Placeholder when Camera is inactive */}
            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Camera className="h-8 w-8" />
                </div>
                <p className="text-sm font-semibold text-zinc-300">Camera Stream Inactive</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Click 'Start Camera' or select photos from gallery below
                </p>
                <Button
                  onClick={() => startCamera()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Start Camera 📷
                </Button>
              </div>
            )}

            {/* Camera Viewfinder Overlay Guide Frame */}
            {isCameraActive && (
              <div className="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3 z-10">
                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-400 bg-black/50 backdrop-blur-xs px-2 py-1 rounded-lg self-start">
                  <span>📄 ALIGN DOCUMENT IN FRAME</span>
                </div>
                <div className="text-[10px] font-bold text-zinc-300 bg-black/50 backdrop-blur-xs px-2 py-1 rounded-lg self-center">
                  Filter: {filterMode.toUpperCase()}
                </div>
              </div>
            )}

            {/* Bottom Camera Toolbar Controls */}
            {isCameraActive && (
              <div className="absolute bottom-4 inset-x-4 flex items-center justify-between z-20 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                {/* Switch Camera */}
                <button
                  onClick={toggleCamera}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Switch Camera (Front/Back)"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>

                {/* Shutter Snap Button */}
                <button
                  onClick={capturePhoto}
                  className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer border-4 border-white/20"
                  title="Snap Document Photo"
                >
                  <Camera className="h-7 w-7" />
                </button>

                {/* Gallery Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Import from Gallery"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Enhancement Filter Controls */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Document Filter:
            </span>

            <div className="flex items-center gap-1.5">
              {[
                { id: "magic", label: "Magic B&W" },
                { id: "grayscale", label: "Grayscale" },
                { id: "original", label: "Original" }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterMode === f.id
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hidden File Input for Gallery Fallback */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
        </div>

        {/* Right Column: Scanned Pages Tray & PDF Export */}
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  Scanned Pages ({capturedPages.length})
                </h3>
                {capturedPages.length > 0 && (
                  <button
                    onClick={() => setCapturedPages([])}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Scanned Pages Thumbnails Grid */}
              {capturedPages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3">
                    <Camera className="h-6 w-6 text-zinc-400" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No pages scanned yet</p>
                  <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                    Tap the shutter button or upload photos to capture pages into your PDF
                  </p>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 text-xs font-bold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-none cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Photos
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {capturedPages.map((page, index) => (
                    <div
                      key={index}
                      className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-xs"
                    >
                      <img src={page} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute top-1.5 left-1.5 text-[9px] font-black bg-black/70 text-white px-1.5 py-0.5 rounded">
                        Page {index + 1}
                      </span>
                      <button
                        onClick={() => removePage(index)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                        title="Delete Page"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Convert to PDF Action Button */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                onClick={convertToPdf}
                disabled={capturedPages.length === 0 || isProcessing}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 border-none"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Compiling PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    <span>Convert {capturedPages.length} Pages to PDF 🚀</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
