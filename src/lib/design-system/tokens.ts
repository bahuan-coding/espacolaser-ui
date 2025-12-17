// Premium White Theme - Revolut-inspired Design System
export const colors = {
  background: {
    app: "bg-slate-50",
    card: "bg-white",
    elevated: "bg-white",
    subtle: "bg-slate-100",
  },
  border: {
    default: "border-slate-200",
    subtle: "border-slate-100",
    focus: "border-emerald-500",
  },
  text: {
    primary: "text-slate-900",
    secondary: "text-slate-600",
    muted: "text-slate-500",
    inverse: "text-white",
  },
  accent: {
    gradient: "bg-gradient-to-r from-emerald-500 to-cyan-500",
    gradientHover: "hover:from-emerald-600 hover:to-cyan-600",
    gradientText: "bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent",
    success: "text-emerald-600",
    info: "text-cyan-600",
    warning: "text-amber-600",
    danger: "text-red-600",
    successBg: "bg-emerald-50",
    infoBg: "bg-cyan-50",
    warningBg: "bg-amber-50",
    dangerBg: "bg-red-50",
  },
} as const;

export const spacing = {
  page: "p-4 lg:p-6",
  section: "space-y-6",
  cardGap: "gap-4",
  containerMax: "max-w-7xl mx-auto",
} as const;

export const typography = {
  pageTitle: "text-2xl font-bold text-slate-900",
  pageSubtitle: "text-slate-500 mt-1",
  sectionTitle: "text-lg font-semibold text-slate-900",
  sectionSubtitle: "text-sm text-slate-500",
  body: "text-sm text-slate-700",
  muted: "text-sm text-slate-500",
  label: "text-sm font-medium text-slate-700",
} as const;

export const radius = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
} as const;

export const cardStyles = {
  base: "p-6 bg-white border border-slate-200 rounded-2xl shadow-sm",
  interactive: "p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all",
} as const;

export const buttonStyles = {
  primary: "px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
  secondary: "px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-all",
  ghost: "px-4 py-2 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-all",
  danger: "px-4 py-2 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-all",
} as const;

export const inputStyles = {
  base: "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all",
  error: "w-full px-4 py-2.5 bg-white border border-red-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all",
} as const;
