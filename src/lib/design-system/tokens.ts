export const colors = {
  background: {
    app: "bg-slate-950",
    card: "bg-slate-900/50",
    elevated: "bg-slate-900/80",
  },
  border: {
    default: "border-slate-800",
    subtle: "border-slate-800/50",
  },
  text: {
    primary: "text-white",
    secondary: "text-slate-400",
    muted: "text-slate-500",
  },
  accent: {
    gradient: "bg-gradient-to-r from-emerald-500 to-cyan-500",
    gradientHover: "hover:from-emerald-600 hover:to-cyan-600",
    gradientText: "bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent",
    success: "text-emerald-400",
    info: "text-cyan-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  },
} as const;

export const spacing = {
  page: "p-6",
  section: "space-y-6",
  cardGap: "gap-4",
  containerMax: "max-w-7xl mx-auto",
} as const;

export const typography = {
  pageTitle: "text-2xl font-bold text-white",
  pageSubtitle: "text-slate-400 mt-1",
  sectionTitle: "text-lg font-semibold text-white",
  sectionSubtitle: "text-sm text-slate-400",
  body: "text-sm text-slate-300",
  muted: "text-sm text-slate-500",
  label: "text-sm font-medium text-slate-300",
} as const;

export const radius = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
} as const;

export const cardStyles = {
  base: "p-6 bg-slate-900/50 border border-slate-800 rounded-2xl",
  interactive: "p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-900/70 transition-colors",
} as const;
