/** Pages slide in from the right (from the left when going back). CSS, so it works before JS loads. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
