import * as React from "react"
import { FileUp, Trash2, ArrowLeft, Download, RefreshCw, QrCode } from "lucide-react"
import { Button } from "../components/ui/button"
import { useToast } from "../components/ui/toast"
import { PDFDocument } from "pdf-lib"
import * as QRCode from "qrcode"

type QrType = "url" | "text" | "wifi" | "contact" | "email" | "sms"

export function QrGenerator({ onBack }: { onBack: () => void }) {
  const { toast } = useToast()
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // Input states
  const [qrType, setQrType] = React.useState<QrType>("url")
  const [url, setUrl] = React.useState("https://ghostpdf.com")
  const [text, setText] = React.useState("Hello from GhostPDF!")
  const [wifiSsid, setWifiSsid] = React.useState("")
  const [wifiPassword, setWifiPassword] = React.useState("")
  const [wifiSecurity, setWifiSecurity] = React.useState<"WEP" | "WPA" | "nopass">("WPA")
  
  // Contact info
  const [contactName, setContactName] = React.useState("")
  const [contactPhone, setContactPhone] = React.useState("")
  const [contactEmail, setContactEmail] = React.useState("")
  const [contactCompany, setContactCompany] = React.useState("")
  const [contactTitle, setContactTitle] = React.useState("")
  const [contactUrl, setContactUrl] = React.useState("")

  // Email info
  const [emailTo, setEmailTo] = React.useState("")
  const [emailSubject, setEmailSubject] = React.useState("")
  const [emailBody, setEmailBody] = React.useState("")

  // SMS info
  const [smsPhone, setSmsPhone] = React.useState("")
  const [smsMessage, setSmsMessage] = React.useState("")

  // Style states
  const [foregroundColor, setForegroundColor] = React.useState("#000000")
  const [backgroundColor, setBackgroundColor] = React.useState("#ffffff")
  const [qrSize, setQrSize] = React.useState<number>(256)
  const [errorCorrection, setErrorCorrection] = React.useState<"L" | "M" | "Q" | "H">("H")
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [logoImage, setLogoImage] = React.useState<HTMLImageElement | null>(null)

  // Generate payload string
  const getQrValue = () => {
    switch (qrType) {
      case "url":
        return url.startsWith("http") ? url : `https://${url}`
      case "text":
        return text
      case "wifi":
        // format: WIFI:S:SSID;T:WPA;P:PASSWORD;;
        return `WIFI:S:${wifiSsid};T:${wifiSecurity};P:${wifiPassword};;`
      case "contact":
        // format: vCard 3.0
        return [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${contactName}`,
          contactPhone ? `TEL:${contactPhone}` : "",
          contactEmail ? `EMAIL:${contactEmail}` : "",
          contactCompany ? `ORG:${contactCompany}` : "",
          contactTitle ? `TITLE:${contactTitle}` : "",
          contactUrl ? `URL:${contactUrl}` : "",
          "END:VCARD"
        ]
          .filter(Boolean)
          .join("\n")
      case "email":
        // format: mailto:to?subject=subject&body=body
        return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      case "sms":
        // format: SMSTO:phone:message
        return `SMSTO:${smsPhone}:${smsMessage}`
      default:
        return ""
    }
  }

  // Draw QR code with customization and logo overlay
  const drawQrCode = React.useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const value = getQrValue()
    if (!value) return

    try {
      // Draw standard QR Code on canvas
      await QRCode.toCanvas(canvas, value, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: foregroundColor,
          light: backgroundColor
        }
      })

      // Draw custom logo overlay if loaded
      if (logoImage) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          const logoSize = qrSize * 0.22 // Center logo is 22% of total size
          const x = (qrSize - logoSize) / 2
          const y = (qrSize - logoSize) / 2

          // Draw white round backdrop for logo
          ctx.fillStyle = backgroundColor
          ctx.beginPath()
          ctx.arc(qrSize / 2, qrSize / 2, logoSize / 2 + 4, 0, Math.PI * 2)
          ctx.fill()

          // Draw round logo image
          ctx.save()
          ctx.beginPath()
          ctx.arc(qrSize / 2, qrSize / 2, logoSize / 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(logoImage, x, y, logoSize, logoSize)
          ctx.restore()
        }
      }
    } catch (err) {
      console.error(err)
    }
  }, [qrType, url, text, wifiSsid, wifiPassword, wifiSecurity, contactName, contactPhone, contactEmail, contactCompany, contactTitle, contactUrl, emailTo, emailSubject, emailBody, smsPhone, smsMessage, foregroundColor, backgroundColor, qrSize, errorCorrection, logoImage])

  // Redraw when settings change
  React.useEffect(() => {
    drawQrCode()
  }, [drawQrCode])

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        setLogoFile(file)
        setLogoImage(img)
        toast({
          title: "Logo loaded",
          description: "Center logo overlay added to QR Code.",
          variant: "success"
        })
      }
    }
  }

  // Download formats
  const downloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `qrcode_${qrType}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const downloadSvg = async () => {
    const value = getQrValue()
    try {
      const svgStr = await QRCode.toString(value, {
        type: "svg",
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: foregroundColor,
          light: backgroundColor
        }
      })
      const blob = new Blob([svgStr], { type: "image/svg+xml" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = `qrcode_${qrType}.svg`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast({
        title: "Export failed",
        description: "Could not export to SVG format.",
        variant: "destructive"
      })
    }
  }

  const downloadPdf = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const pdfDoc = await PDFDocument.create()
      // A4 page size
      const page = pdfDoc.addPage([595, 842])

      // Convert canvas to png data url
      const pngDataUrl = canvas.toDataURL("image/png")
      const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer())
      const pngImage = await pdfDoc.embedPng(pngBytes)

      // Center the QR code in the middle of A4 page
      const imageWidth = qrSize
      const imageHeight = qrSize
      const x = (595 - imageWidth) / 2
      const y = (842 - imageHeight) / 2

      page.drawImage(pngImage, {
        x,
        y,
        width: imageWidth,
        height: imageHeight
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes] as any, { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = `qrcode_${qrType}.pdf`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "PDF generated",
        description: "QR Code embedded into PDF and downloaded.",
        variant: "success"
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Export failed",
        description: "Could not generate PDF with QR Code.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="flex-1 py-8 px-6 md:px-12 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
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
            QR Code Generator
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Generate high-resolution QR codes with custom styling, logos, and export formats.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Control Panel */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/30 dark:bg-zinc-900/10">
            {/* Type tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-5">
              {(["url", "text", "wifi", "contact", "email", "sms"] as QrType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setQrType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                    qrType === t
                      ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950"
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Config inputs based on type */}
            <div className="flex flex-col gap-4">
              {qrType === "url" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Website URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g. ghostpdf.com"
                    className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                  />
                </div>
              )}

              {qrType === "text" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Plain Text</label>
                  <textarea
                    rows={3}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter message to encode..."
                    className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                  />
                </div>
              )}

              {qrType === "wifi" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Network Name (SSID)</label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="SSID name"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Security Type</label>
                    <select
                      value={wifiSecurity}
                      onChange={(e) => setWifiSecurity(e.target.value as any)}
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    >
                      <option value="WPA">WPA / WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">Unsecured (No Password)</option>
                    </select>
                  </div>
                  {wifiSecurity !== "nopass" && (
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Password</label>
                      <input
                        type="password"
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        placeholder="Network password"
                        className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                      />
                    </div>
                  )}
                </div>
              )}

              {qrType === "contact" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Full Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Jane Doe"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Phone Number</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Website</label>
                    <input
                      type="text"
                      value={contactUrl}
                      onChange={(e) => setContactUrl(e.target.value)}
                      placeholder="www.company.com"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Company</label>
                    <input
                      type="text"
                      value={contactCompany}
                      onChange={(e) => setContactCompany(e.target.value)}
                      placeholder="Acme Inc."
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Job Title</label>
                    <input
                      type="text"
                      value={contactTitle}
                      onChange={(e) => setContactTitle(e.target.value)}
                      placeholder="Software Engineer"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                </div>
              )}

              {qrType === "email" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Email Recipient</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="support@ghostpdf.com"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Inquiry"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Message Body</label>
                    <textarea
                      rows={3}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Type details..."
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                </div>
              )}

              {qrType === "sms" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Phone Number</label>
                    <input
                      type="tel"
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">SMS Message</label>
                    <textarea
                      rows={2}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Hello, please contact me..."
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Styling options */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/30 dark:bg-zinc-900/10 flex flex-col gap-6">
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
              Customization Options
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Color pickers */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Foreground Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="h-9 w-9 rounded border border-zinc-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="h-9 px-3 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs bg-white dark:bg-zinc-950 focus:outline-none font-semibold uppercase"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-9 w-9 rounded border border-zinc-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-9 px-3 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs bg-white dark:bg-zinc-950 focus:outline-none font-semibold uppercase"
                  />
                </div>
              </div>

              {/* Size slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">QR Code Size</label>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{qrSize} x {qrSize} px</span>
                </div>
                <input
                  type="range"
                  min="128"
                  max="512"
                  step="32"
                  value={qrSize}
                  onChange={(e) => setQrSize(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-50"
                />
              </div>

              {/* Error correction levels */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Error Correction Level</label>
                <select
                  value={errorCorrection}
                  onChange={(e) => setErrorCorrection(e.target.value as any)}
                  className="h-9 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs focus:outline-none font-semibold focus:ring-2 focus:ring-zinc-500/50"
                >
                  <option value="L">Low (7% recovery - best for clean/simple QR)</option>
                  <option value="M">Medium (15% recovery)</option>
                  <option value="Q">Quartile (25% recovery)</option>
                  <option value="H">High (30% recovery - recommended with logos)</option>
                </select>
              </div>

              {/* Logo upload overlay */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-250">Center Logo Overlay (Optional)</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" className="w-full text-xs font-bold h-9 cursor-pointer gap-2">
                      <FileUp className="h-4 w-4" />
                      {logoFile ? logoFile.name : "Choose logo file"}
                    </Button>
                  </div>
                  {logoFile && (
                    <Button
                      onClick={() => {
                        setLogoFile(null)
                        setLogoImage(null)
                      }}
                      variant="ghost"
                      size="icon"
                      className="text-zinc-400 hover:text-red-500 hover:bg-red-500/10 h-9 w-9 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview & Download Panel */}
        <div>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col items-center gap-6 sticky top-5">
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 self-start pb-2 border-b border-zinc-200 dark:border-zinc-800 w-full">
              <QrCode className="h-4.5 w-4.5 text-zinc-500" />
              <span className="text-xs font-bold">Live Preview</span>
            </div>

            {/* QR Canvas Container */}
            <div className="p-3 bg-white rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center min-h-[160px] min-w-[160px] max-w-full">
              <canvas ref={canvasRef} className="max-w-full rounded" style={{ height: "180px", width: "180px" }} />
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-2">
              <Button
                onClick={downloadPng}
                className="w-full cursor-pointer h-9 text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Download PNG
              </Button>
              <Button
                onClick={downloadSvg}
                variant="outline"
                className="w-full cursor-pointer h-9 text-xs font-bold dark:hover:bg-zinc-900"
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Download SVG
              </Button>
              <Button
                onClick={downloadPdf}
                variant="outline"
                className="w-full cursor-pointer h-9 text-xs font-bold dark:hover:bg-zinc-900 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Export to PDF
              </Button>
            </div>
            
            <button
              onClick={drawQrCode}
              className="text-[10px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Force Redraw
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
