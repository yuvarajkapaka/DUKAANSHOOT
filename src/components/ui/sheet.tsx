"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, m as motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMedia } from "@/lib/client/use-media";
import { DUR, EASE, dialog as motionDialog, scrim, spring } from "@/lib/motion";
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
  // tablet/desktop: the dialog comes into focus; phones: the sheet rises on a no-overshoot spring
  // and leaves faster than it came (the user has already moved on)
  const motionProps = dialog
    ? { variants: motionDialog, initial: "hidden", animate: "show", exit: "exit" }
    : {
        initial: { y: "100%" },
        animate: { y: 0, transition: spring.snappy },
        exit: { y: "100%", transition: { duration: DUR.normal, ease: EASE.in } },
        drag: "y" as const,
        dragControls: drag,
        dragListener: false,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.7 },
        onDragEnd,
      };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-night/55" variants={scrim} initial="hidden" animate="show" exit="exit" />
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
                  <Dialog.Close className="group inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-paper shadow-soft transition-[background-color,transform] hover:bg-accent-soft active:scale-95" aria-label={t("close")}>
                    <X className="size-6 transition-transform duration-300 group-hover:rotate-90" aria-hidden />
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
