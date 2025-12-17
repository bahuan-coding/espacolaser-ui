import { typography } from "@/lib/design-system/tokens";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className={typography.pageTitle + " text-slate-900 dark:text-slate-100"}>{title}</h1>
        {subtitle && <p className={typography.pageSubtitle + " text-slate-600 dark:text-slate-400"}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
