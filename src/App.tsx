import * as React from "react"
import {
  Search, Moon, Sun, Info, X,
  Settings, Star, Clock, Home,
  Files, Split, Layers, Maximize2, Unlock,
  Shield, Crop, PenTool, FileDigit, Stamp,
  ScanText, FileDown, FileImage, FileText,
  BookOpen, RefreshCw, ArrowLeftRight, Clock as ClockIcon,
  Image, Folder, Bot, Wrench, ChevronDown, ChevronRight, HelpCircle, Cloud, Sparkles
} from "lucide-react"

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

  // Collapsible accordion states
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({
    "pdf-tools": true,
    "utilities": true
  })

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
    if (activeTool === "merge") {
      return <MergePdf onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "split") {
      return <SplitPdf onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "organize") {
      return <OrganizePdf onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "compress") {
      return <CompressPdf onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "resize") {
      return <ResizePdf onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "qrgenerator") {
      return <QrGenerator onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "unlock") {
      return <UnlockPdf onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "protect") {
      return <ProtectPdf onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "pagenum") {
      return <AddPageNumbers onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "flatten") {
      return <FlattenPdf onBack={() => setActiveTool(null)} />
    }
    if (activeTool === "img2pdf") {
      return <ImageToPdf onBack={() => setActiveTool(null)} />
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

    // ── Favorites Panel ───────────────────────────────────────────────
    if (activeMenu === "favorites") {
      const favTools = tools.filter(t => favoritedTools.includes(t.id))
      return (
        <div className="flex-1 py-8 px-6 md:px-12 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">Favorites</h1>
              <p className="text-sm text-zinc-400">Star tools on the home screen to pin them here</p>
            </div>
          </div>
          {favTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Star className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
              <p className="text-base font-semibold text-zinc-500">No favorites yet</p>
              <p className="text-sm text-zinc-400 mt-1">Click the ⭐ on any tool card to save it here</p>
              <button
                onClick={() => { setActiveMenu("all-tools"); setActiveTool(null) }}
                className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >Browse Tools</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {favTools.map(t => (
                <div
                  key={t.id}
                  onClick={() => openTool(t.id, t.name)}
                  className="group relative flex flex-col p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-400/50 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/45 cursor-pointer shadow-sm transition-all"
                >
                  <button
                    onClick={e => toggleFavorite(e, t.id)}
                    className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
                  >
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  </button>
                  <div className="mb-4"><span className="p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/60 inline-flex"><ToolIcon iconName={t.icon} className={`h-6 w-6 ${t.color}`} /></span></div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{t.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{t.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // ── Templates Panel ───────────────────────────────────────────────
    if (activeMenu === "templates") {
      const templates = [
        { title: "Merge & Compress", desc: "Combine multiple PDFs then shrink the file size", steps: ["merge", "compress"], emoji: "📦", color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20" },
        { title: "Scan to PDF", desc: "Snap photos then convert images to a single PDF doc", steps: ["img2pdf"], emoji: "📸", color: "from-blue-500/10 to-sky-500/10 border-blue-500/20" },
        { title: "Secure & Share", desc: "Password-protect your PDF before sending it", steps: ["protect"], emoji: "🔒", color: "from-indigo-500/10 to-purple-500/10 border-indigo-500/20" },
        { title: "Sign Document", desc: "Draw your signature and stamp it onto the PDF", steps: ["sign"], emoji: "✍️", color: "from-teal-500/10 to-cyan-500/10 border-teal-500/20" },
        { title: "PDF to Images", desc: "Export every page as a high-quality JPG file", steps: ["pdf2jpg"], emoji: "🖼️", color: "from-pink-500/10 to-rose-500/10 border-pink-500/20" },
        { title: "Remove Password", desc: "Unlock an encrypted PDF with your password", steps: ["unlock"], emoji: "🔑", color: "from-amber-500/10 to-yellow-500/10 border-amber-500/20" },
        { title: "Number Pages", desc: "Add page numbers to a document before printing", steps: ["pagenum"], emoji: "🔢", color: "from-cyan-500/10 to-sky-500/10 border-cyan-500/20" },
        { title: "QR Code", desc: "Generate a branded QR code for a URL or contact", steps: ["qrgenerator"], emoji: "⬛", color: "from-purple-500/10 to-violet-500/10 border-purple-500/20" },
        { title: "Flatten PDF", desc: "Flatten annotations and form fields into the page", steps: ["flatten"], emoji: "📄", color: "from-sky-500/10 to-blue-500/10 border-sky-500/20" },
      ]
      return (
        <div className="flex-1 py-8 px-6 md:px-12 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">Templates</h1>
              <p className="text-sm text-zinc-400">Quick-start workflows for common tasks</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {templates.map((tpl, i) => {
              const firstTool = tools.find(t => t.id === tpl.steps[0])
              return (
                <div
                  key={i}
                  onClick={() => firstTool && openTool(firstTool.id, firstTool.name)}
                  className={`group flex flex-col gap-3 p-5 rounded-2xl border bg-gradient-to-br ${tpl.color} hover:scale-[1.02] cursor-pointer transition-all duration-200 shadow-sm`}
                >
                  <div className="text-3xl">{tpl.emoji}</div>
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">{tpl.title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{tpl.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-auto pt-1 flex-wrap">
                    {tpl.steps.map(sid => {
                      const st = tools.find(t => t.id === sid)
                      return st ? (
                        <span key={sid} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border border-white/40 dark:border-zinc-700">{st.name}</span>
                      ) : null
                    })}
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              )
            })}
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
            <div className="flex items-center gap-2">
              <button
                id="slide-left"
                onClick={() => {
                  const el = document.getElementById("tools-slider")
                  if (el) el.scrollBy({ left: -360, behavior: "smooth" })
                }}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 cursor-pointer transition-colors"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <button
                id="slide-right"
                onClick={() => {
                  const el = document.getElementById("tools-slider")
                  if (el) el.scrollBy({ left: 360, behavior: "smooth" })
                }}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 cursor-pointer transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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
            // Slider wrapper with blur-edge mask
            <div className="relative">
              {/* Left blur edge */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-zinc-50 dark:from-zinc-950 to-transparent" />
              {/* Right blur edge */}
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-zinc-50 dark:from-zinc-950 to-transparent" />

              {/* Scrollable row */}
              <div
                id="tools-slider"
                className="flex gap-3 overflow-x-auto scroll-smooth pb-4 px-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
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
                    className={`group relative flex flex-col p-5 rounded-xl border transition-all duration-200 text-left shrink-0 w-44 ${
                      t.isActive
                        ? "border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/40 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/45 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        : "border-zinc-200/50 dark:border-zinc-800/30 bg-zinc-100/20 dark:bg-zinc-900/10 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="shrink-0 p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/60 group-hover:scale-110 transition-transform inline-flex">
                        <ToolIcon iconName={t.icon} className={`h-6 w-6 ${t.color}`} />
                      </span>
                      <div className="flex items-center gap-1">
                        {t.isActive && (
                          <button
                            onClick={e => toggleFavorite(e, t.id)}
                            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
                            title={favoritedTools.includes(t.id) ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Star className={`h-3.5 w-3.5 transition-colors ${
                              favoritedTools.includes(t.id) ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-600 group-hover:text-amber-400"
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
            </div>
          )}
        </div>

        {/* Bottom Banner - QR Generator */}
        <div
          onClick={() => setActiveTool("qrgenerator")}
          className="mt-8 p-4 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/60 flex items-center justify-center shrink-0">
              <ScanText className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">QR Generator</span>
                <span className="text-[9px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded">NEW</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                Generate QR Codes for URLs, Text, WiFi, Contacts & more
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors">

      {/* Sidebar Layout */}
      <aside className="w-[260px] border-r border-white/10 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-950/70 backdrop-blur-xl shrink-0 hidden md:flex flex-col justify-between p-5 select-none shadow-[1px_0_24px_0_rgba(0,0,0,0.06)] dark:shadow-[1px_0_24px_0_rgba(0,0,0,0.3)]">
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

          {/* Collapsible Accordion Navigation — with blur-fade scroll edges */}
          <div className="relative">
            {/* Top fade */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 bg-gradient-to-b from-white/80 dark:from-zinc-950/80 to-transparent" />
            {/* Bottom fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 z-10 bg-gradient-to-t from-white/90 dark:from-zinc-950/90 to-transparent" />

          <nav className="flex flex-col gap-1 overflow-y-auto max-h-[420px] pr-1 py-2" style={{ scrollbarWidth: "none" }}>
            {/* Home */}
            <button
              onClick={() => { setActiveTool(null); setActiveMenu("all-tools"); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${activeMenu === "all-tools" && !activeTool
                ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 border border-zinc-300 dark:border-zinc-800"
                : "text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 border border-transparent"
                }`}
            >
              <Home className="h-4 w-4 text-emerald-500" />
              <span>Home 🏠</span>
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

            {/* AI Studio */}
            <div>
              <button
                onClick={() => toggleMenu("ai-studio")}
                className="flex items-center justify-between w-full px-3 py-2 text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-4 w-4 text-purple-500" />
                  <span>AI Studio</span>
                </div>
                {expandedMenus["ai-studio"] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {expandedMenus["ai-studio"] && (
                <div className="ml-4 pl-3 border-l border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 mt-1">
                  {[
                    { id: "ocr", label: "OCR Text Recognition 👀", color: "text-rose-500" },
                    { id: "watermark", label: "Smart Watermark 💧", color: "text-blue-400" },
                    { id: "compress", label: "AI Compress ✨", color: "text-purple-500" },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTool(item.id)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all w-full text-left cursor-pointer ${
                        activeTool === item.id
                          ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-300"
                      }`}
                    >
                      <Sparkles className={`h-3 w-3 ${item.color}`} />
                      <span className="truncate">{item.label}</span>
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
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all w-full text-left cursor-pointer ${
                        activeTool === item.id
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
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all w-full text-left cursor-pointer ${
                        activeTool === item.id
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                activeMenu === "recent"
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
            <button
              onClick={() => { setActiveMenu("favorites"); setActiveTool(null) }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                activeMenu === "favorites"
                  ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-300 dark:border-zinc-800"
                  : "text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-300 border border-transparent"
              }`}
            >
              <Star className={`h-4 w-4 ${favoritedTools.length > 0 ? "text-amber-500 fill-amber-500" : ""}`} />
              Favorites
              {favoritedTools.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-amber-400/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">{favoritedTools.length}</span>
              )}
            </button>
            <button
              onClick={() => toast({ title: "Cloud Storage", description: "Connect to Google Drive or Dropbox." })}
              className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all border border-transparent"
            >
              <Cloud className="h-4 w-4" />
              Cloud Storage
            </button>
            <button
              onClick={() => { setActiveMenu("templates"); setActiveTool(null) }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                activeMenu === "templates"
                  ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-300 dark:border-zinc-800"
                  : "text-zinc-500 hover:bg-white/40 dark:hover:bg-zinc-900/60 hover:text-zinc-800 dark:hover:text-zinc-300 border border-transparent"
              }`}
            >
              <FileText className="h-4 w-4" />
              Templates
            </button>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-1 border-t border-zinc-200 dark:border-zinc-900 pt-3 mt-2">
              <button
                onClick={() => toast({ title: "Settings", description: "Configure system themes and visual styles." })}
                className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={() => toast({ title: "Help Center", description: "Visit our help center for assistance." })}
                className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
              >
                <HelpCircle className="h-4 w-4" />
                Help Center
              </button>
              <button
                onClick={() => toast({ title: "About Us", description: "GhostPDF is built client-side with privacy first." })}
                className="flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-200/30 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-lg text-sm font-semibold cursor-pointer transition-all"
              >
                <Info className="h-4 w-4" />
                About Us
              </button>
            </div>
          </nav>
          </div>
        </div>

        {/* Upgrade Pro Widget */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-zinc-100/50 dark:bg-zinc-900/30">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            Upgrade to GhostPDF Pro 👑
          </span>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-505 mt-1 leading-normal">
            Unlock all premium tools, AI features & more.
          </p>
          <Button
            onClick={() => toast({ title: "Upgrade Pro", description: "Stripe payment integration coming soon." })}
            className="w-full mt-3 h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-orange-500 dark:to-amber-500 dark:hover:from-orange-600 dark:hover:to-amber-600 text-white rounded-lg cursor-pointer border-none shadow-sm shadow-blue-500/20 dark:shadow-orange-500/20"
          >
            Upgrade Now 💎
          </Button>
        </div>

      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Navbar */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-900 px-6 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50 backdrop-blur shrink-0 select-none">
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Logo */}
            <img src={theme === "dark" ? "/logo.png" : "/logo_light.png"} alt="GhostPDF Logo" className="h-14 w-14 object-contain rounded-md shrink-0" />
            <span className="font-extrabold text-sm tracking-tight text-zinc-950 dark:text-zinc-50">GhostPDF</span>
          </div>

          <div className="hidden md:block" />

          {/* Theme switcher + AI Assistant + About button */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 h-9 w-9 shrink-0 cursor-pointer"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({ title: "AI Assistant", description: "AI PDF Copilot is scheduled for release in Q3." })}
              className="h-8 text-xs font-bold flex gap-1.5 items-center cursor-pointer border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Assistant
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({
                title: "GhostPDF v0.1.0 (MVP)",
                description: "Built strictly client-side using React, Tailwind CSS, pdf-lib, and pdf.js."
              })}
              className="h-8 text-xs font-bold flex gap-1.5 items-center cursor-pointer dark:hover:bg-zinc-900"
            >
              <Info className="h-3.5 w-3.5" />
              About Us
            </Button>
          </div>
        </header>

        {/* Dynamic Inner Panel */}
        <main className="flex-1 overflow-y-auto">
          {renderMainContent()}
        </main>
      </div>

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
