import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  icon?: ReactNode;
  status?: "success" | "warning" | "danger" | "info" | "default";
}

interface TimelineProps {
  events: TimelineEvent[];
  emptyMessage?: string;
  className?: string;
}

const statusColors = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-cyan-500",
  default: "bg-slate-400",
};

const statusBgColors = {
  success: "bg-emerald-50",
  warning: "bg-amber-50",
  danger: "bg-red-50",
  info: "bg-cyan-50",
  default: "bg-slate-50",
};

export function Timeline({ events, emptyMessage = "Nenhum evento registrado", className }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" aria-hidden="true" />
      
      <div className="space-y-4">
        {events.map((event, index) => {
          const status = event.status || "default";
          const isLast = index === events.length - 1;
          
          return (
            <div key={event.id} className="relative flex gap-4 pl-10">
              {/* Dot */}
              <div 
                className={cn(
                  "absolute left-2.5 w-3 h-3 rounded-full ring-4 ring-white",
                  statusColors[status]
                )}
                aria-hidden="true"
              />
              
              {/* Content */}
              <div 
                className={cn(
                  "flex-1 p-3 rounded-xl border",
                  statusBgColors[status],
                  status === "default" ? "border-slate-200" : `border-${status === "success" ? "emerald" : status === "warning" ? "amber" : status === "danger" ? "red" : "cyan"}-200`
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {event.icon && (
                      <span className="text-slate-600" aria-hidden="true">
                        {event.icon}
                      </span>
                    )}
                    <p className="text-sm font-medium text-slate-900">
                      {event.title}
                    </p>
                  </div>
                  <time 
                    dateTime={event.timestamp.toISOString()}
                    className="text-xs text-slate-500 whitespace-nowrap"
                  >
                    {formatDateTime(event.timestamp)}
                  </time>
                </div>
                {event.description && (
                  <p className="mt-1 text-sm text-slate-600">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

