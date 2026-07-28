import * as React from "react"
import {
  Search, Moon, Sun, Info, X,
  Settings, Star, Clock, Home,
  Files, Split, Layers, Maximize2, Unlock,
  Shield, Crop, PenTool, FileDigit, Stamp,
  ScanText, FileDown, FileImage, FileText,
  BookOpen, RefreshCw, ArrowLeftRight, Clock as ClockIcon,
  Image, Folder, Wrench, ChevronDown, ChevronRight, HelpCircle,
  ShieldCheck, CheckCircle2, Lock
} from "lucide-react"

declare global {
  interface Window {
    Razorpay?: any
  }
}

const ToolIcon = ({ iconName, className }: { iconName: string, className?: string }) => {
  const props = { className: className || "h-6 w-6 text-zinc-900 dark:text-zinc-50" };
  switch (iconName) {
    case "files": return <Files {...props} />;
    case "split": return <Split {...props} />;
    case "layers": return <Layers {...props} />;
    case "maximize2": return <Maximize2 {...props} />;
    case "unlock": return <Unlock {...props} />;
    case "shield": return <Shield {...props} />;
    case "crop": return <Crop {...props} />;
    case "pentool": return <PenTool {...props} />;
    case "filedigit": return <FileDigit {...props} />;
    case "stamp": return <Stamp {...props} />;
    case "scantext": return <ScanText {...props} />;
    case "filedown": return <FileDown {...props} />;
    case "fileimage": return <FileImage {...props} />;
    case "filetext": return <FileText {...props} />;
    case "bookopen": return <BookOpen {...props} />;
    case "refreshcw": return <RefreshCw {...props} />;
    case "image": return <Image {...props} />;
    case "arrowleftright": return <ArrowLeftRight {...props} />;
    case "clock": return <ClockIcon {...props} />;
    default: return <Files {...props} />;
  }
}

// Import custom providers
import { ThemeProvider, useTheme } from "./components/ThemeProvider"
import { ToastProvider, useToast } from "./components/ui/toast"
import { Button } from "./components/ui/button"

// Import Tool Workspaces
import { MergePdf } from "./tools/MergePdf"
import { SplitPdf } from "./tools/SplitPdf"
import { OrganizePdf } from "./tools/OrganizePdf"
import { CompressPdf } from "./tools/CompressPdf"
import { ResizePdf } from "./tools/ResizePdf"
import { QrGenerator } from "./tools/QrGenerator"
import { UnlockPdf } from "./tools/UnlockPdf"
import { ProtectPdf } from "./tools/ProtectPdf"
import { AddPageNumbers } from "./tools/AddPageNumbers"
import { FlattenPdf } from "./tools/FlattenPdf"
import { ImageToPdf } from "./tools/ImageToPdf"
import { PlaceholderWorkspace } from "./tools/PlaceholderWorkspace"

// Interface for all tools
interface ToolItem {
  id: string
  name: string
  desc: string
  icon: string
  emoji: string
  tag?: string
  color: string
  isActive: boolean
}

function DashboardContent() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [activeTool, setActiveTool] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeMenu, setActiveMenu] = React.useState("all-tools")
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false)
  const [showSecurityModal, setShowSecurityModal] = React.useState(false)
  type UserTier = "free" | "medium" | "pro"
  const [userTier, setUserTier] = React.useState<UserTier>(() => {
    try {
      const stored = localStorage.getItem("ghostpdf_tier")
      if (stored === "pro" || stored === "medium") return stored as UserTier
      if (localStorage.getItem("ghostpdf_pro") === "true") return "pro"
      return "free"
    } catch {
      return "free"
    }
  })

  const activateTier = (tier: "medium" | "pro", paymentId?: string) => {
    setUserTier(tier)
    try {
      localStorage.setItem("ghostpdf_tier", tier)
      if (tier === "pro") localStorage.setItem("ghostpdf_pro", "true")
    } catch {}

    const title = tier === "pro" ? "🎉 GhostPDF Pro (12 Months) Activated!" : "⚡ GhostPDF Medium (12 Months) Activated!"
    const desc = tier === "pro"
      ? `Payment ID: ${paymentId || "rzp_live"}. UNLIMITED file sizes & batching active for 12 Months!`
      : `Payment ID: ${paymentId || "rzp_live"}. 50 MB file size & 10 files batching active for 12 Months!`

    toast({ title, description: desc, variant: "success" })
    setShowUpgradeModal(false)
  }

  // Cancel Subscription / Downgrade Handler
  const handleCancelSubscription = () => {
    setUserTier("free")
    try {
      localStorage.removeItem("ghostpdf_pro")
      localStorage.setItem("ghostpdf_tier", "free")
    } catch {}
    toast({
      title: "Subscription Cancelled ❌",
      description: "Your membership has been reverted to the Free Tier (10 MB per file limit).",
      variant: "destructive"
    })
  }

  // Razorpay Multi-Tier Checkout Handler (12 Months Access)
  const handleRazorpayPayment = async (tier: "medium" | "pro" = "pro") => {
    if (!navigator.onLine) {
      toast({
        title: "🌐 Internet Connection Required",
        description: "An active internet connection is needed once during Razorpay checkout. All tools work 100% offline after activation!",
        variant: "destructive"
      })
      return
    }

    const amountInPaise = tier === "medium" ? 19900 : 49900
    const planTitle = tier === "medium" ? "GhostPDF Medium Plan (12 Months)" : "GhostPDF Pro Plan (12 Months)"

    let order_id = ""
    let amount = amountInPaise
    let currency = "INR"

    try {
      // STEP 1: Backend Create Order (/api/create-order)
      const createOrderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`
        })
      })

      if (createOrderRes.ok) {
        const orderData = await createOrderRes.json().catch(() => ({}))
        if (orderData.order_id) {
          order_id = orderData.order_id
          amount = orderData.amount || amountInPaise
          currency = orderData.currency || "INR"
        }
      }
    } catch (err) {
      console.warn("Backend create-order exception, falling back to direct checkout:", err)
    }

    // STEP 2: Load Razorpay Checkout SDK
    const loadScript = () =>
      new Promise<boolean>((resolve) => {
        if (window.Razorpay) return resolve(true)
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
      })

    const isLoaded = await loadScript()
    if (!isLoaded) {
      toast({
        title: "Razorpay SDK Error",
        description: "Could not load Razorpay checkout script. Please check your network connection.",
        variant: "destructive"
      })
      return
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_TJ05dWObToopMI"

    // STEP 3: Open Razorpay Modal
    const options: any = {
      key: razorpayKey,
      amount: amount,
      currency: currency,
      name: planTitle,
      description: `12 Months Access (${tier === "medium" ? "50MB Limit" : "Unlimited MB"})`,
      image: "/logo.png",
      handler: async function (response: any) {
        // STEP 4: Backend Verify Signature if order_id is present
        if (response.razorpay_order_id && response.razorpay_signature) {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            })

            const verifyData = await verifyRes.json().catch(() => ({}))
            if (verifyRes.ok && verifyData.status === "success") {
              activateTier(tier, response.razorpay_payment_id)
              return
            }
          } catch (err) {
            console.warn("Verification API exception:", err)
          }
        }
        // Activate plan on successful payment completion
        activateTier(tier, response.razorpay_payment_id || "rzp_live")
      },
      modal: {
        ondismiss: function () {
          toast({
            title: "Checkout Cancelled",
            description: "Razorpay payment window was dismissed.",
            variant: "destructive"
          })
        }
      },
      prefill: {
        name: "GhostPDF Member",
        email: "user@ghostpdf.com"
      },
      theme: {
        color: tier === "medium" ? "#3b82f6" : "#f59e0b"
      }
    }

    if (order_id) {
      options.order_id = order_id
    }

    const rzp = new window.Razorpay(options)
    rzp.on("payment.failed", function (response: any) {
      toast({
        title: "Payment Transaction Failed",
        description: response.error?.description || "Payment attempt failed.",
        variant: "destructive"
      })
    })
    rzp.open()
  }

  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Favourites — stored in localStorage
  const [favoritedTools, setFavoritedTools] = React.useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("ghostpdf_favorites") || "[]") } catch { return [] }
  })

  // Recent activity — { id, name, timestamp }[]
  const [recentActivity, setRecentActivity] = React.useState<{ id: string; name: string; ts: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem("ghostpdf_recent") || "[]") } catch { return [] }
  })

  const openTool = (id: string, name: string) => {
    setActiveTool(id)
    setActiveMenu("all-tools")
    const entry = { id, name, ts: Date.now() }
    setRecentActivity(prev => {
      const updated = [entry, ...prev.filter(r => r.id !== id)].slice(0, 20)
      localStorage.setItem("ghostpdf_recent", JSON.stringify(updated))
      return updated
    })
  }

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setFavoritedTools(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      localStorage.setItem("ghostpdf_favorites", JSON.stringify(next))
      return next
    })
  }

  // Collapsible accordion states — collapsed by default
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({})

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({ ...prev, [menuKey]: !prev[menuKey] }))
  }

  // 24 PDF Tools mapping the exact screenshot
  const tools: ToolItem[] = [
    { id: "merge", name: "Merge PDF", desc: "(Drag & Drop Reorder) 🧩", icon: "files", emoji: "🧩", color: "text-emerald-500", isActive: true },
    { id: "split", name: "Split PDF", desc: "(Range, Extract) ✂️", icon: "split", emoji: "✂️", color: "text-blue-500", isActive: true },
    { id: "flatten", name: "Flatten PDF", desc: "(Local) ⚡", icon: "layers", emoji: "⚡", color: "text-yellow-500", isActive: true },
    { id: "resize", name: "Resize PDF", desc: "(Local) 📥", icon: "maximize2", emoji: "📥", color: "text-sky-500", isActive: true },
    { id: "unlock", name: "Unlock PDF", desc: "(with password) 🔑", icon: "unlock", emoji: "🔑", color: "text-amber-500", isActive: true },
    { id: "protect", name: "Protect PDF", desc: "(Password/Encryption) 🛡️", icon: "shield", emoji: "🛡️", color: "text-indigo-500", isActive: true },
    { id: "crop", name: "Crop PDF", desc: "(Local) ✂️", icon: "crop", emoji: "✂️", color: "text-red-500", isActive: true },
    { id: "sign", name: "Sign PDF", desc: "(Local Signature Draw) ✍️", icon: "pentool", emoji: "✍️", color: "text-teal-500", isActive: true },
    { id: "pagenum", name: "Add Page Numbers", desc: "123", icon: "filedigit", emoji: "🔢", color: "text-cyan-500", isActive: true },
    { id: "watermark", name: "Add Watermark", desc: "💧", icon: "stamp", emoji: "💧", color: "text-blue-400", isActive: true },
    { id: "ocr", name: "OCR", desc: "(Local with Tesseract.js) 👀", icon: "scantext", emoji: "👀", color: "text-rose-500", isActive: true },
    { id: "compress", name: "Compress PDF", desc: "(Canvas Render, Quality Slider) ✨", icon: "filedown", emoji: "✨", color: "text-purple-500", isActive: true },
    { id: "img2pdf", name: "Image to PDF", desc: "(JPG/PNG Local) 🖼️", icon: "fileimage", emoji: "🖼️", color: "text-emerald-400", isActive: true },
    { id: "pdf2word", name: "PDF to Word", desc: "(DOCX difficult, with warning) ⚠️", icon: "filetext", emoji: "⚠️", color: "text-red-400", isActive: true },
    { id: "pdf2jpg", name: "PDF to JPG", desc: "(Local) 🖼️", icon: "fileimage", emoji: "🖼️", color: "text-pink-500", isActive: true },
    { id: "pdf2epub", name: "PDF to EPUB", desc: "(Local) 📚", icon: "bookopen", emoji: "📚", color: "text-violet-500", isActive: true },
    { id: "webp2png", name: "WEBP to PNG", desc: "(Local) 🔄", icon: "refreshcw", emoji: "🔄", color: "text-sky-400", isActive: true },
    { id: "jfif2png", name: "JFIF to PNG", desc: "(Local) 🔄", icon: "refreshcw", emoji: "🔄", color: "text-indigo-400", isActive: true },
    { id: "png2svg", name: "PNG to SVG", desc: "(Local) 🎨", icon: "refreshcw", emoji: "🎨", color: "text-yellow-400", isActive: true },
    { id: "heic2jpg", name: "HEIC to JPG/PNG", desc: "(Local) 📸", icon: "refreshcw", emoji: "📸", color: "text-blue-600", isActive: true },
    { id: "imageresize", name: "Image Resizer", desc: "(with caution for enlarged quality) ⚠️", icon: "image", emoji: "⚠️", color: "text-amber-600", isActive: true },
    { id: "cropimage", name: "Crop Image", desc: "(Local) ✂️", icon: "crop", emoji: "✂️", color: "text-red-600", isActive: true },
    { id: "unitconv", name: "Unit Converter", desc: "(Local) ⚖️", icon: "arrowleftright", emoji: "⚖️", color: "text-slate-500", isActive: true },
    { id: "timeconv", name: "Time Converter", desc: "(Local) 🕒", icon: "clock", emoji: "🕒", color: "text-slate-500", isActive: true }
  ]

  const pdfMenuTools = [
    { id: "merge", name: "Merge PDF", emoji: "🧩", icon: "files", color: "text-emerald-500", isActive: true },
    { id: "split", name: "Split PDF", emoji: "✂️", icon: "split", color: "text-blue-500", isActive: true },
    { id: "compress", name: "Compress PDF", emoji: "✨", icon: "filedown", color: "text-purple-500", isActive: true },
    { id: "ocr", name: "OCR (Text Recognition)", emoji: "👀", icon: "scantext", color: "text-rose-500", isActive: true },
    { id: "convert", name: "Convert PDF", emoji: "🔄", icon: "refreshcw", color: "text-sky-500", isActive: true },
    { id: "organize", name: "Organize Pages", emoji: "📄", icon: "layers", color: "text-orange-500", isActive: true },
    { id: "security", name: "Security (Lock/Unlock)", emoji: "🔒", icon: "shield", color: "text-indigo-500", isActive: true },
    { id: "sign", name: "Sign PDF", emoji: "✍️", icon: "pentool", color: "text-teal-500", isActive: true }
  ]

  // Filter tools by search query
  const filteredTools = tools.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.desc.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Listen to Ctrl + / shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const triggerPlaceholderToast = (name: string) => {
    toast({
      title: "Coming Soon",
      description: `The "${name}" tool is currently scheduled for the next beta release.`,
      variant: "default"
    })
  }

  // Render active workspace or main grid
  const renderMainContent = () => {
    const toolProps = {
      onBack: () => setActiveTool(null),
      userTier,
      onRequirePro: () => setShowUpgradeModal(true)
    }

    if (activeTool === "merge") {
      return <MergePdf {...toolProps} />
    }
    if (activeTool === "split") {
      return <SplitPdf {...toolProps} />
    }
    if (activeTool === "organize") {
      return <OrganizePdf {...toolProps} />
    }
    if (activeTool === "compress") {
      return <CompressPdf {...toolProps} />
    }
    if (activeTool === "resize") {
      return <ResizePdf {...toolProps} />
    }
    if (activeTool === "qrgenerator") {
      return <QrGenerator onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "unlock") {
      return <UnlockPdf {...toolProps} />
    }
    if (activeTool === "protect") {
      return <ProtectPdf {...toolProps} />
    }
    if (activeTool === "pagenum") {
      return <AddPageNumbers {...toolProps} />
    }
    if (activeTool === "flatten") {
      return <FlattenPdf {...toolProps} />
    }
    if (activeTool === "img2pdf") {
      return <ImageToPdf {...toolProps} />
    }

    if (activeTool) {
      const currentTool = tools.find(t => t.id === activeTool)
      if (currentTool) {
        return (
          <PlaceholderWorkspace
            toolId={currentTool.id}
            toolName={currentTool.name}
            toolIcon={<ToolIcon iconName={currentTool.icon} />}
            toolColor={currentTool.color}
            onBack={() => setActiveTool(null)}
          />
        )
      }
    }

    // ── Recent Files Panel ────────────────────────────────────────────
    if (activeMenu === "recent") {
      return (
        <div className="flex-1 py-8 px-6 md:px-12 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 flex items-center justify-center">
              <Clock className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">Recent Files</h1>
              <p className="text-sm text-zinc-400">Tools you opened this session &amp; previously</p>
            </div>
            {recentActivity.length > 0 && (
              <button
                onClick={() => { setRecentActivity([]); localStorage.removeItem("ghostpdf_recent") }}
                className="ml-auto text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
              >Clear history</button>
            )}
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Clock className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
              <p className="text-base font-semibold text-zinc-500">No recent activity yet</p>
              <p className="text-sm text-zinc-400 mt-1">Open any tool and it will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentActivity.map((r, i) => {
                const tool = tools.find(t => t.id === r.id)
                const ago = Math.round((Date.now() - r.ts) / 60000)
                const agoStr = ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`
                return (
                  <div
                    key={i}
                    onClick={() => openTool(r.id, r.name)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition-all group"
                  >
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-zinc-200/50 dark:bg-zinc-800/60">
                      {tool ? <ToolIcon iconName={tool.icon} className={`h-5 w-5 ${tool.color}`} /> : <FileText className="h-5 w-5 text-zinc-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{r.name}</p>
                      <p className="text-xs text-zinc-400">{agoStr}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // ── About Us Panel ───────────────────────────────────────────────
    if (activeMenu === "about") {
      return (
        <div className="flex-1 py-10 px-6 md:px-12 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 shrink-0 shadow-sm">
              <Info className="h-7 w-7 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">About GhostPDF</h1>
                <span className="text-xs font-bold bg-cyan-500/10 text-cyan-500 px-2.5 py-0.5 rounded-full border border-cyan-500/20">v1.0.0</span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                The Privacy-First, 100% Client-Side PDF Toolkit 👻
              </p>
            </div>
          </div>

          {/* Hero Mission Card */}
          <div className="relative overflow-hidden p-8 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 dark:from-cyan-950/20 dark:via-blue-950/20 dark:to-purple-950/20 mb-10 shadow-sm">
            <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50 mb-3">
              Your Files Never Leave Your Device 🔒
            </h2>
            <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-3xl">
              GhostPDF was built with a single core principle: <strong className="text-zinc-900 dark:text-zinc-100">complete user privacy and data security</strong>. Unlike traditional online PDF tools that upload your sensitive documents to remote servers, GhostPDF processes 100% of your files locally inside your web browser using WebAssembly and modern browser APIs.
            </p>
          </div>

          {/* Key Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 hover:border-cyan-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">100% Local &amp; Private</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Zero file uploads, zero server processing, and zero data tracking. Your documents remain strictly on your machine.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 hover:border-cyan-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                <ClockIcon className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Works Fully Offline</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Once loaded, GhostPDF requires no active internet connection. Work seamlessly on airplanes, remote areas, or offline setups.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 hover:border-cyan-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <Wrench className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">24+ Powerful Tools</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Merge, Split, Flatten, Resize, Compress, Unlock, Protect, OCR, Sign, Page Numbers, Watermarks &amp; QR Generator.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 hover:border-amber-500/50 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 text-xl">
                👑
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Pro (Unlimited &amp; Offline)</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Process unlimited files with zero caps. Internet is needed <strong>only once during Razorpay checkout</strong> — all Pro tools run 100% offline afterwards!
              </p>
            </div>
          </div>

          {/* Technology & Open Source */}
          <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Free &amp; Open Source</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                GhostPDF is built using React, Vite, PDF-Lib, Tesseract.js, and PDF.js. Free for everyone forever without ads or mandatory sign-ups.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { setActiveMenu("all-tools"); setActiveTool(null); }}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
              >
                Browse Tools 🚀
              </button>
            </div>
          </div>
        </div>
      )
    }

    // ── Settings & Membership Dashboard ───────────────────────────
    if (activeMenu === "settings") {
      return (
        <div className="flex-1 py-8 px-6 md:px-12 max-w-5xl mx-auto w-full animate-in fade-in duration-300 space-y-6">
          {/* Settings Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="h-12 w-12 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 flex items-center justify-center shrink-0">
              <Settings className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">System Settings</h1>
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Manage subscription cancellation, About Us, Help Guide, and appearance</p>
            </div>
          </div>

          {/* 1. Membership & Subscription Settings (with Cancel Option) */}
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 text-xl shrink-0">
                  👑
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">Membership &amp; Subscription</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Current Active Tier: <span className="font-extrabold text-amber-500 uppercase">{userTier}</span>
                  </p>
                </div>
              </div>

              {userTier !== "free" ? (
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Cancel Subscription / Downgrade to Free ❌</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Upgrade Plan 👑</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">File Size Limit</span>
                <p className="font-black text-zinc-900 dark:text-zinc-50 text-sm mt-1">
                  {userTier === "pro" ? "Unlimited MB" : userTier === "medium" ? "50 MB per file" : "10 MB per file"}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Batch Processing</span>
                <p className="font-black text-zinc-900 dark:text-zinc-50 text-sm mt-1">
                  {userTier === "pro" ? "Unlimited Files" : userTier === "medium" ? "10 Files batch" : "3 Files batch"}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Duration</span>
                <p className="font-black text-zinc-900 dark:text-zinc-50 text-sm mt-1">
                  {userTier === "free" ? "Lifetime Free" : "12 Months Access"}
                </p>
              </div>
            </div>
          </div>

          {/* 2. About Us */}
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Info className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">About GhostPDF Engine</h3>
            </div>
            <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              GhostPDF is engineered with W3C WebCrypto and WebAssembly to execute 100% of document processing inside your device's browser memory (RAM). Confidential documents never leave your system, guaranteeing complete privacy and zero server leaks.
            </p>
          </div>

          {/* 3. Help Center & FAQ */}
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">Help &amp; Support Guide</h3>
            </div>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">🌐 Is Internet required for GhostPDF?</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  An active internet connection is needed only once during Razorpay checkout. Once activated, GhostPDF Pro runs 100% offline without internet.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">🔒 How do I cancel my subscription?</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  You can click the <strong>Cancel Subscription</strong> button above at any time to immediately revert your plan to the Free Tier.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">✉️ Need help or support?</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Contact our support team anytime at <a href="mailto:support@ghostpdf.com" className="text-amber-500 font-bold underline">support@ghostpdf.com</a>.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Appearance Settings */}
          <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">Interface Theme</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Switch between Dark Mode and Light Mode</p>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold text-xs border border-zinc-200 dark:border-zinc-800 cursor-pointer flex items-center gap-2 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
              <span>{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex-1 py-8 px-6 md:px-12 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
        {/* Top Header */}
        <div className="text-center mb-10 flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            All-in-One PDF Tools 🚀
          </h1>
          <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 mt-3 font-medium flex items-center justify-center gap-2 flex-wrap">
            <span>100% Free</span> • <span>No Sign Up</span> • <span>Works Offline</span> • <span>Your Privacy, Our Priority 🔒</span>
          </p>

          {/* File Limits Indicator Banner */}
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 text-xs font-semibold shadow-xs">
            {userTier === "pro" ? (
              <span className="text-amber-500 font-extrabold flex items-center gap-1.5">
                👑 GhostPDF Pro Active: UNLIMITED File Sizes &amp; Unlimited Batching (12 Months)
              </span>
            ) : userTier === "medium" ? (
              <div className="flex items-center gap-2 text-blue-500 font-bold">
                <span>⚡ Medium Plan Active: 50 MB Max &bull; 10 Files Batch (12 Months)</span>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-amber-500 hover:text-amber-600 font-extrabold underline cursor-pointer"
                >
                  Upgrade to Pro 👑
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <span>Free Version: 10 MB Max per File &bull; 3 Files Batch</span>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-amber-500 hover:text-amber-600 font-extrabold underline cursor-pointer"
                >
                  Upgrade Plans ⚡
                </button>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full max-w-xl mt-8">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tools... (e.g. merge, split, QR)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm font-medium transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
              </button>
            ) : (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold tracking-wide bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700">
                Ctrl + /
              </span>
            )}
          </div>

          {/* Top Banner - QR Generator */}
          <div
            onClick={() => setActiveTool("qrgenerator")}
            className="w-full max-w-xl mt-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-500/40 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <ScanText className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">QR Generator</span>
                  <span className="text-[9px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded">NEW</span>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Generate QR Codes for URLs, Text, WiFi, Contacts &amp; more
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-400" />
          </div>
        </div>

        {/* Section title & Tools Slider */}
        <div>
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 m-0">
                {searchQuery ? `Results for "${searchQuery}"` : "All PDF Tools"}
              </h2>
              <span className="text-xs bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 px-2 py-0.5 rounded-full font-semibold text-zinc-500 dark:text-zinc-400">
                {filteredTools.length} {filteredTools.length === 1 ? "Tool" : "Tools"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 px-2.5 py-1 rounded-full font-semibold text-zinc-500 dark:text-zinc-400">
                Scroll to view all
              </span>
            </div>
          </div>

          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
              </div>
              <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">No tools found</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">No results for <span className="font-medium text-zinc-600 dark:text-zinc-400">"{searchQuery}"</span></p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Clear search
              </button>
            </div>
          ) : (
            /* Dedicated Vertical Scroll Grid Layout */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[500px] overflow-y-auto pr-2 pb-2 scroll-smooth">
              {filteredTools.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    if (t.isActive) {
                      openTool(t.id, t.name)
                    } else {
                      triggerPlaceholderToast(t.name)
                    }
                  }}
                  className={`group relative flex flex-col p-4 rounded-xl border transition-all duration-200 text-left ${t.isActive
                      ? "border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/40 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/45 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      : "border-zinc-200/50 dark:border-zinc-800/30 bg-zinc-100/20 dark:bg-zinc-900/10 cursor-not-allowed opacity-60"
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="shrink-0 p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/60 group-hover:scale-110 transition-transform inline-flex">
                      <ToolIcon iconName={t.icon} className={`h-5 w-5 ${t.color}`} />
                    </span>
                    <div className="flex items-center gap-1">
                      {t.isActive && (
                        <button
                          onClick={e => toggleFavorite(e, t.id)}
                          className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
                          title={favoritedTools.includes(t.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star className={`h-3.5 w-3.5 transition-colors ${favoritedTools.includes(t.id) ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-600 group-hover:text-amber-400"
                            }`} />
                        </button>
                      )}
                      {!t.isActive && (
                        <span className="text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-200/40 dark:bg-zinc-800/30 px-1.5 py-0.5 rounded uppercase">Soon</span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                    {t.name}
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {t.desc}
                  </p>
                  {t.isActive && (
                    <span className="mt-3 self-start text-[9px] font-bold tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase border border-emerald-500/10">Offline</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors">

      {/* Sidebar Layout — 100% Fixed & Stable */}
      <aside className="w-[260px] h-full border-r border-white/10 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/70 backdrop-blur-xl shrink-0 hidden md:flex flex-col justify-between p-5 select-none shadow-[1px_0_24px_0_rgba(0,0,0,0.06)] dark:shadow-[1px_0_24px_0_rgba(0,0,0,0.3)] overflow-y-auto">
        <div className="flex flex-col gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-1.5">
            <img src={theme === "dark" ? "/logo.png" : "/logo_light.png"} alt="GhostPDF Logo" className="h-12 w-12 object-contain rounded-lg shrink-0" />
            <div>
              <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-50">Ghost</span>
              <span className="font-extrabold text-base tracking-tight text-cyan-400">PDF</span>
              <span className="text-[8px] tracking-wider text-zinc-400 dark:text-zinc-500 font-bold block leading-normal uppercase">SAFE • LOCAL • SECURE PDF TOOLS</span>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex flex-col gap-1 py-1">
              {/* Home */}
              <button
                onClick={() => { setActiveTool(null); setActiveMenu("all-tools"); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${activeMenu === "all-tools" && !activeTool
                  ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 border border-zinc-300 dark:border-zinc-800"
                  : "text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 border border-transparent"
                  }`}
              >
                <Home className="h-4 w-4 text-emerald-500" />
                <span>Home </span>
              </button>

              {/* PDF Tools Dropdown */}
              <div>
                <button
                  onClick={() => toggleMenu("pdf-tools")}
                  className="flex items-center justify-between w-full px-3 py-2 text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                    <span>PDF Tools</span>
                  </div>
                  {expandedMenus["pdf-tools"] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                {expandedMenus["pdf-tools"] && (
                  <div className="ml-4 pl-3 border-l border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 mt-1">
                    {pdfMenuTools.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (t.isActive) {
                            setActiveTool(t.id)
                          } else {
                            triggerPlaceholderToast(t.name)
                          }
                        }}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all w-full text-left cursor-pointer ${activeTool === t.id
                          ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-300"
                          }`}
                      >
                        <ToolIcon iconName={t.icon} className={`h-3.5 w-3.5 ${t.color}`} />
                        <span className="truncate">{t.name} {t.emoji}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Image Tools */}
              <div>
                <button
                  onClick={() => toggleMenu("image-tools")}
                  className="flex items-center justify-between w-full px-3 py-2 text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Image className="h-4 w-4 text-blue-500" />
                    <span>Image Tools</span>
                  </div>
                  {expandedMenus["image-tools"] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                {expandedMenus["image-tools"] && (
                  <div className="ml-4 pl-3 border-l border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 mt-1">
                    {[
                      { id: "img2pdf", label: "Image to PDF 🖼️", color: "text-emerald-400" },
                      { id: "pdf2jpg", label: "PDF to JPG 📸", color: "text-pink-500" },
                      { id: "webp2png", label: "WEBP to PNG 🔄", color: "text-sky-400" },
                      { id: "jfif2png", label: "JFIF to PNG 🔄", color: "text-indigo-400" },
                      { id: "heic2jpg", label: "HEIC to JPG 📷", color: "text-blue-600" },
                      { id: "png2svg", label: "PNG to SVG 🎨", color: "text-yellow-400" },
                      { id: "imageresize", label: "Image Resizer ⚠️", color: "text-amber-600" },
                      { id: "cropimage", label: "Crop Image ✂️", color: "text-red-600" },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActiveTool(item.id)}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all w-full text-left cursor-pointer ${activeTool === item.id
                          ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-300"
                          }`}
                      >
                        <FileImage className={`h-3 w-3 ${item.color}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Office Tools */}
              <div>
                <button
                  onClick={() => toggleMenu("office-tools")}
                  className="flex items-center justify-between w-full px-3 py-2 text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    <span>Office Tools</span>
                  </div>
                  {expandedMenus["office-tools"] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                {expandedMenus["office-tools"] && (
                  <div className="ml-4 pl-3 border-l border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 mt-1">
                    {[
                      { id: "pdf2word", label: "PDF to Word ⚠️", color: "text-red-400" },
                      { id: "pdf2epub", label: "PDF to EPUB 📚", color: "text-violet-500" },
                      { id: "unitconv", label: "Unit Converter ⚖️", color: "text-slate-500" },
                      { id: "timeconv", label: "Time Converter 🕒", color: "text-slate-500" },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActiveTool(item.id)}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all w-full text-left cursor-pointer ${activeTool === item.id
                          ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-300"
                          }`}
                      >
                        <FileText className={`h-3 w-3 ${item.color}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Utilities */}
              <div>
                <button
                  onClick={() => toggleMenu("utilities")}
                  className="flex items-center justify-between w-full px-3 py-2 text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="h-4 w-4 text-zinc-500" />
                    <span>Utilities</span>
                  </div>
                  {expandedMenus["utilities"] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                {expandedMenus["utilities"] && (
                  <div className="ml-4 pl-3 border-l border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 mt-1">
                    <button
                      onClick={() => setActiveTool("qrgenerator")}
                      className="flex items-center justify-between w-full px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-300 cursor-pointer text-left"
                    >
                      <span>QR Generator</span>
                      <span className="text-[8px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded scale-90">NEW</span>
                    </button>
                    <button
                      onClick={() => setActiveTool("unitconv")}
                      className="flex items-center gap-2.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-300 cursor-pointer text-left"
                    >
                      <span>Unit Converter ⚖️</span>
                    </button>
                    <button
                      onClick={() => setActiveTool("timeconv")}
                      className="flex items-center gap-2.5 px-2 py-1 rounded-md text-xs font-medium text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-300 cursor-pointer text-left"
                    >
                      <span>Time Converter 🕒</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Independent Navigation */}
              <button
                onClick={() => { setActiveMenu("recent"); setActiveTool(null) }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${activeMenu === "recent"
                  ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-300 dark:border-zinc-800"
                  : "text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-300 border border-transparent"
                  }`}
              >
                <Clock className="h-4 w-4" />
                Recent Files
                {recentActivity.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-full">{recentActivity.length}</span>
                )}
              </button>
              {/* Bottom Actions */}
              <div className="flex flex-col gap-1 border-t border-zinc-200 dark:border-zinc-900 pt-3 mt-2">
                <button
                  onClick={() => { setActiveMenu("settings"); setActiveTool(null); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${activeMenu === "settings"
                    ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-300 dark:border-zinc-800"
                    : "text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 border border-transparent"
                    }`}
                >
                  <Settings className="h-4 w-4 text-amber-500" />
                  Settings
                </button>
                <button
                  onClick={() => { setActiveMenu("settings"); setActiveTool(null); }}
                  className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                >
                  <HelpCircle className="h-4 w-4 text-emerald-500" />
                  Help Center
                </button>
                <button
                  onClick={() => { setActiveMenu("about"); setActiveTool(null); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${activeMenu === "about"
                    ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-300 dark:border-zinc-800"
                    : "text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 border border-transparent"
                    }`}
                >
                  <Info className="h-4 w-4 text-cyan-400" />
                  About Us
                </button>
              </div>
            </nav>
        </div>

        {/* Sidebar Upgrade / Status Widget */}
        {userTier !== "pro" && (
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/30">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              {userTier === "medium" ? "Medium Plan Active ⚡" : "Upgrade to Pro 👑"}
            </span>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-normal">
              {userTier === "medium" ? "50 MB limit active. Upgrade to Pro for Unlimited MB!" : "Unlock Unlimited File Sizes & 12 Months Access."}
            </p>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full mt-3 h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg cursor-pointer border-none shadow-sm shadow-amber-500/20"
            >
              {userTier === "medium" ? "Upgrade to Pro 👑" : "Upgrade Now ⚡"}
            </Button>
          </div>
        )}

      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top Navbar */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-900 px-6 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur shrink-0 select-none">
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Logo */}
            <img src={theme === "dark" ? "/logo.png" : "/logo_light.png"} alt="GhostPDF Logo" className="h-14 w-14 object-contain rounded-md shrink-0" />
            <span className="font-extrabold text-sm tracking-tight text-zinc-950 dark:text-zinc-50">GhostPDF</span>
          </div>

          <div className="hidden md:block" />

          {/* Theme switcher + Security status + About button + User Tier Badge */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 h-9 w-9 shrink-0 cursor-pointer"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Website Safety & Security Audit */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSecurityModal(true)}
              className="h-8 text-xs font-bold flex gap-1.5 items-center cursor-pointer border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              title="100% Safe & Verified Client-Side Execution"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden sm:inline">100% Safe 🔒</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setActiveMenu("about"); setActiveTool(null); }}
              className="h-8 text-xs font-bold flex gap-1.5 items-center cursor-pointer dark:hover:bg-zinc-900"
            >
              <Info className="h-3.5 w-3.5" />
              About Us
            </Button>

            {userTier === "pro" ? (
              <Button
                size="sm"
                onClick={() => toast({ title: "👑 GhostPDF Pro Active", description: "Your 12-Month Pro Membership is active with Unlimited File Sizes & Unlimited Batching!" })}
                className="h-8 text-xs font-extrabold flex gap-1.5 items-center cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none shadow-sm shadow-amber-500/20"
              >
                Pro 👑
              </Button>
            ) : userTier === "medium" ? (
              <Button
                size="sm"
                onClick={() => setShowUpgradeModal(true)}
                className="h-8 text-xs font-bold flex gap-1.5 items-center cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-sm shadow-blue-500/20"
              >
                Medium ⚡
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowUpgradeModal(true)}
                className="h-8 text-xs font-bold flex gap-1.5 items-center cursor-pointer bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700"
              >
                Free ⚡
              </Button>
            )}
          </div>
        </header>

        {/* Dynamic Inner Panel */}
        <main className="flex-1 overflow-y-auto">
          {renderMainContent()}
        </main>
      </div>

      {/* Upgrade Pro Modal with Razorpay Checkout */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-3">
                <span className="text-3xl">👑</span>
              </div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">GhostPDF Pro Upgrade</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Unlock Unlimited Speed, Batch Processing &amp; Supporter Perks
              </p>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-3 mb-6 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              {[
                { title: "⚡ UNLIMITED File Sizes", desc: "Free Tier: 10 MB per file limit  |  GhostPDF Pro: Unlimited MB" },
                { title: "⚡ UNLIMITED Batch Processing", desc: "Free Tier: Max 3 files limit  |  GhostPDF Pro: Unlimited Files" },
                { title: "⚡ All 24+ PDF & Image Tools", desc: "Full access to Merge, Split, Compress, OCR, Sign & QR" },
                { title: "⚡ 100% Offline & Private", desc: "Runs 100% in local browser RAM with zero server tracking" },
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{feat.title}</h4>
                    <p className="text-[10px] text-zinc-400">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Internet Requirement Notice */}
            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
              <span className="text-base shrink-0">🌐</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                <strong>Internet Required Only Once for Upgrade:</strong> An active internet connection is needed to complete the Razorpay checkout. Once activated, <strong>GhostPDF Pro runs 100% offline with zero file size limits!</strong>
              </p>
            </div>

            {/* Live Gateway Notice */}
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left space-y-1">
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                🔒 Live Razorpay Payment Gateway
              </p>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-snug">
                Supports real UPI (PhonePe, Google Pay, Paytm, BHIM), NetBanking, and Domestic/International Debit &amp; Credit Cards.
              </p>
            </div>

            {/* Pricing Cards (3 Tiers: Free, Medium 12M, Pro 12M) */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {/* Free Tier */}
              <div
                onClick={() => {
                  toast({ title: "Free Plan", description: "You are on the free tier (10 MB limit & 3 files batch)." })
                  setShowUpgradeModal(false)
                }}
                className={`p-3 rounded-xl border transition-all text-center cursor-pointer ${userTier === "free" ? "border-zinc-400 dark:border-zinc-600 bg-zinc-200/50 dark:bg-zinc-800/60" : "border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 hover:border-zinc-400"}`}
              >
                <span className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase block">Free Tier</span>
                <div className="text-base font-black text-zinc-900 dark:text-zinc-50 mt-0.5">$0</div>
                <span className="text-[9px] text-zinc-400 block">10MB &bull; 3 Files</span>
                <span className="mt-2 block text-[9px] font-semibold text-zinc-500">{userTier === "free" ? "Current" : "Free"}</span>
              </div>

              {/* Medium Tier */}
              <div
                onClick={() => handleRazorpayPayment("medium")}
                className={`p-3 rounded-xl border transition-all text-center relative cursor-pointer ${userTier === "medium" ? "border-blue-500 bg-blue-500/10" : "border-blue-500/30 bg-blue-500/5 hover:border-blue-500"}`}
              >
                <span className="absolute top-0 right-0 bg-blue-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl">STARTER</span>
                <span className="text-[9px] font-bold tracking-wider text-blue-500 uppercase block">Medium</span>
                <div className="text-base font-black text-zinc-900 dark:text-zinc-50 mt-0.5">₹199 <span className="text-[8px] text-zinc-400">/ 12M</span></div>
                <span className="text-[9px] text-zinc-400 block">50MB &bull; 10 Files</span>
                <span className="mt-2 block text-[9px] font-bold text-blue-500">{userTier === "medium" ? "Active ⚡" : "Get Medium ⚡"}</span>
              </div>

              {/* Pro Tier */}
              <div
                onClick={() => handleRazorpayPayment("pro")}
                className={`p-3 rounded-xl border transition-all text-center relative cursor-pointer ${userTier === "pro" ? "border-amber-500 bg-amber-500/10" : "border-amber-500/40 bg-amber-500/10 hover:border-amber-500"}`}
              >
                <span className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl">UNLIMITED</span>
                <span className="text-[9px] font-bold tracking-wider text-amber-500 uppercase block">Pro Unlimited</span>
                <div className="text-base font-black text-zinc-900 dark:text-zinc-50 mt-0.5">₹499 <span className="text-[8px] text-zinc-400">/ 12M</span></div>
                <span className="text-[9px] text-zinc-400 block">Unlimited MB &bull; Files</span>
                <span className="mt-2 block text-[9px] font-bold text-amber-500">{userTier === "pro" ? "Active 👑" : "Get Pro 👑"}</span>
              </div>
            </div>

            {/* Razorpay Trust Badge */}
            <div className="flex items-center justify-center gap-2 mb-4 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
              <Lock className="h-3 w-3 text-emerald-500" />
              <span>Secured by Razorpay • UPI / Cards / NetBanking / Wallets</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleRazorpayPayment("medium")}
                className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Medium Plan (₹199)</span>
              </button>

              <button
                onClick={() => handleRazorpayPayment("pro")}
                className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Pro Unlimited (₹499)</span>
              </button>
            </div>

            {/* Modal Bottom Actions (Cancel & Instant Activate) */}
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              >
                Cancel / Close ✖
              </button>
              <button
                onClick={() => activateTier("pro", "demo_instant_pro")}
                className="text-[11px] font-bold text-amber-500 hover:text-amber-600 underline cursor-pointer"
              >
                ⚡ 1-Click Instant Activate Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Website Security & Safety Audit Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setShowSecurityModal(false)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50">Website Security &amp; Safety Guarantee</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Verified 100% Client-Side Private Execution</p>
              </div>
            </div>

            {/* Security Audit Points */}
            <div className="space-y-3 mb-6">
              {[
                { title: "🔒 Zero Server Uploads", desc: "All PDF and image transformations occur strictly in your browser's local RAM. Files never leave your device." },
                { title: "🔐 Web Cryptography API Standard", desc: "PDF encryption & decryption are executed using W3C WebCrypto native browser APIs with AES-256 bits." },
                { title: "👁️ Zero Telemetry & Zero Cookies", desc: "GhostPDF contains zero analytics trackers, zero advertising cookies, and zero third-party telemetry." },
                { title: "🛡️ Ephemeral RAM Memory Sandbox", desc: "Document buffers reside in volatile memory and are immediately garbage collected after processing." },
                { title: "💳 PCI-DSS Level 1 & HMAC-SHA256 Encrypted Payments", desc: "Razorpay 256-Bit SSL Encrypted Gateway with Server-side HMAC-SHA256 Signature Verification & Zero Card Data Storage." }
              ].map((item, index) => (
                <div key={index} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.title}</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSecurityModal(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              Close &amp; Continue Browsing Safe 🔒
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DashboardContent />
      </ToastProvider>
    </ThemeProvider>
  )
}
