import * as React from "react"

type Theme = "light" | "dark"

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || defaultTheme
  })

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem("theme", newTheme)
    setThemeState(newTheme)
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      <div className={theme === 'dark' ? 'dark text-zinc-50 bg-zinc-950' : 'text-zinc-950 bg-zinc-50'}>
        {children}
      </div>
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}
