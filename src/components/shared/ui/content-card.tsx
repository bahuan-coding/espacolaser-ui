import { typography } from "@/lib/design-system/tokens";

interface ContentCardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function ContentCard({ title, description, actions, children }: ContentCardProps) {
  const hasHeader = title || description || actions;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {hasHeader && (
        <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            {title && <h3 className={typography.sectionTitle + " text-slate-900 dark:text-slate-100"}>{title}</h3>}
            {description && <p className={typography.sectionSubtitle + " text-slate-600 dark:text-slate-400"}>{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
