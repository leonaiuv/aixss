import { type ReactNode, type FC } from "react";
import { cn } from "@/lib/utils";

export interface ThreeColumnLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  className?: string;
}

export const ThreeColumnLayout: FC<ThreeColumnLayoutProps> = ({
  left,
  center,
  right,
  className,
}) => {
  return (
    <div className={cn("flex h-screen w-full overflow-hidden", className)}>
      <aside className="flex h-full w-[280px] flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        {left}
      </aside>

      <main className="flex h-full flex-1 flex-col overflow-hidden bg-white dark:bg-gray-800">
        {center}
      </main>

      <aside className="flex h-full w-[400px] flex-shrink-0 flex-col border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        {right}
      </aside>
    </div>
  );
};
