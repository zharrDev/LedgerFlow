type IconProps = { size?: number; className?: string };

function wrapSvg(path: string, props: IconProps, viewBox = "24 24") {
  const { size = 16, className } = props;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${viewBox}`} fill="currentColor" className={className} aria-hidden>
      <path d={path} />
    </svg>
  );
}

export function InstagramIcon(p: IconProps) {
  return wrapSvg(
    "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.2 5.2 0 0 1-5.2 5.2H7.8C4.6 22 2 19.4 2 16.2V7.8A5.2 5.2 0 0 1 7.8 2m-.2 2A3.3 3.3 0 0 0 4.3 7.3v8.4a3.3 3.3 0 0 0 3.3 3.3h8.4a3.3 3.3 0 0 0 3.3-3.3V7.3a3.3 3.3 0 0 0-3.3-3.3H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 6.865a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27m0 1.802A3.333 3.333 0 1 0 12 15.333 3.333 3.333 0 0 0 12 8.667Z",
    p,
  );
}
export function XIcon(p: IconProps) {
  return wrapSvg("M18.9 1h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.59-6.64 7.59H.47l8.6-9.83L0 1.15h7.59l5.24 6.94L18.9 1Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.26Z", p);
}
export function LinkedinIcon(p: IconProps) {
  return wrapSvg("M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.2 0 22.23 0Z", p);
}
export function YoutubeIcon(p: IconProps) {
  return wrapSvg("M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12 9.55 15.57Z", p);
}
export function FacebookIcon(p: IconProps) {
  return wrapSvg("M24 12.07c0-6.63-5.37-12-12-12s-12 5.37-12 12c0 5.99 4.39 10.95 10.13 11.85v-8.39H7.08v-3.47h3.05V9.43c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.39C19.61 23.03 24 18.06 24 12.07Z", p);
}
