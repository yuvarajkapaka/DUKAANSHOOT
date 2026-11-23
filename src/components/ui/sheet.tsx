"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, m as motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMedia } from "@/lib/client/use-media";
import { cn } from "@/lib/utils";

/**
 * Phones: bottom sheet that slides up (drag the handle down to close).
 * Tablet/desktop: a centered dialog. Escape closes; focus is trapped (Radix).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("common");
  const drag = useDragControls();
  const dialog = useMedia("(min-width: 768px)");
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onOpenChange(false);
  };
  const motionProps = dialog
    ? { initial: { opacity: 0, scale: 0.95, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 8 } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, drag: "y" as const, dragControls: drag, dragListener: false, dragConstraints: { top: 0, bottom: 0 }, dragElastic: { top: 0, bottom: 0.7 }, onDragEnd };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-night/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "safe-bottom fixed z-50 overflow-y-auto bg-cream shadow-2xl outline-none",
                  dialog
                    ? "inset-0 m-auto h-fit max-h-[85dvh] w-[calc(100%-48px)] max-w-lg rounded-[28px] px-6 pt-5"
                    : "inset-x-0 bottom-0 max-h-[92dvh] w-full rounded-t-[28px] px-4 pt-2",
                  className,
                )}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                {...motionProps}
              >
                {!dialog ? (
                  <div className="flex cursor-grab touch-none justify-center pt-1 pb-3" onPointerDown={(e) => drag.start(e)} aria-hidden>
                    <span className="h-1.5 w-12 rounded-full bg-line" />
                  </div>
                ) : null}
                <div className="mb-4 flex items-start justify-between gap-3" onPointerDown={dialog ? undefined : (e) => drag.start(e)}>
                  <div>
                    <Dialog.Title className="font-display text-xl">{title}</Dialog.Title>
                    {description ? <Dialog.Description className="mt-1 text-ink-soft">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
                  </div>
                  <Dialog.Close className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-paper shadow-soft transition-colors hover:bg-accent-soft" aria-label={t("close")}>
                    <X className="size-6" aria-hidden />
                  </Dialog.Close>
                </div>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
