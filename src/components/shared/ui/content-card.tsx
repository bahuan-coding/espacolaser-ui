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
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      {hasHeader && (
        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div>
            {title && <h3 className={typography.sectionTitle}>{title}</h3>}
            {description && <p className={typography.sectionSubtitle}>{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
