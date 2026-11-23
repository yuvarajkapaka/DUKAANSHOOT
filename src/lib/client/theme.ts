"use client";
import { useEffect, useState } from "react";

/** Light (default) / dark. Stored on the device; applied before paint by the boot script in layout.tsx. */
export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return {
    dark,
    set: (d: boolean) => {
      document.documentElement.classList.toggle("dark", d);
      localStorage.setItem("ds_theme", d ? "dark" : "light");
      setDark(d);
    },
  };
}

