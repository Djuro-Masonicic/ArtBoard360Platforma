interface DisciplineIconProps {
  slug: string;
}

export function DisciplineIcon({ slug }: DisciplineIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="17"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
      width="17"
    >
      {getIconPaths(slug)}
    </svg>
  );
}

function getIconPaths(slug: string) {
  switch (slug) {
    case "rukotvorine":
      return <><path d="M9 4h6M10 4v2.6C7.3 7.9 5.8 10.2 5.8 13c0 3.9 2.8 6.9 6.2 6.9s6.2-3 6.2-6.9c0-2.8-1.5-5.1-4.2-6.4V4" /><path d="M6.3 11.4h11.4M6.6 15.6h10.8" /></>;
    case "slikarstvo":
      return (
        <>
          <path d="M12 3.6a8.4 8.4 0 1 0 0 16.8c1.2 0 1.9-.8 1.9-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2.1a3.9 3.9 0 0 0 3.9-3.9c0-4-3.7-7.1-8.6-7.1z" />
          <circle cx="7.8" cy="11.2" fill="currentColor" r="1.1" stroke="none" />
          <circle cx="10.4" cy="7.4" fill="currentColor" r="1.1" stroke="none" />
          <circle cx="15" cy="7.6" fill="currentColor" r="1.1" stroke="none" />
        </>
      );
    case "crtez":
      return <><path d="M4.6 19.4l1-3.4L15.8 5.8a1.9 1.9 0 0 1 2.7 2.7L8.2 18.6z" /><path d="M14.4 7.2l2.4 2.4" /></>;
    case "grafika":
      return <><rect height="5.4" rx="2.2" width="12.5" x="4" y="4" /><path d="M16.5 6.7h3v5.1H11v3" /><rect height="5.6" rx="1" width="2.8" x="9.6" y="14.8" /></>;
    case "skulptura":
      return <><circle cx="12" cy="7.2" r="3" /><path d="M7.4 16.4c.6-3 2.4-4.6 4.6-4.6s4 1.6 4.6 4.6z" /><path d="M5.5 20.4h13M8 16.4v4M16 16.4v4" /></>;
    case "fotografija":
      return <><rect height="13" rx="2.6" width="17.2" x="3.4" y="7" /><circle cx="12" cy="13.4" r="3.6" /><path d="M8.6 7l1.4-2.4h4l1.4 2.4" /></>;
    case "ilustracija":
      return <><path d="M19.6 3.6l-8.4 8.4" /><path d="M11.2 12c-2.3-.5-4.3 1-4.6 3.3-.2 1.6-1 2.8-2.8 3.4 3.2 1.6 7 1 8.4-1.5.8-1.6.6-3.4-1-5.2z" /></>;
    case "kolaz":
      return <><rect height="10" rx="1.6" transform="rotate(-8 8.8 9.4)" width="10" x="3.8" y="4.4" /><rect height="10" rx="1.6" transform="rotate(7 15.2 14.6)" width="10" x="10.2" y="9.6" /></>;
    case "mixed-media":
      return <><path d="M12 3.8l8 4.2-8 4.2-8-4.2z" /><path d="M4 12.2l8 4.2 8-4.2" /><path d="M4 16.2l8 4.2 8-4.2" /></>;
    case "mozaik":
      return <><rect height="7" rx="1.4" width="7" x="4" y="4" /><rect height="4.4" rx="1.2" width="7" x="13" y="4" /><rect height="9.6" rx="1.4" width="7" x="13" y="10.4" /><rect height="7" rx="1.4" width="7" x="4" y="13" /></>;
    case "tekstilna-umjetnost":
      return <><path d="M6.5 4h11M6.5 20h11" /><rect height="12" rx="1.2" width="7.2" x="8.4" y="6" /><path d="M8.4 9.4l7.2 2.2M8.4 12.8l7.2 2.2" /></>;
    case "umjetnicki-nakit":
      return <><path d="M7 4.5h10l3.5 4.6L12 19.8 3.5 9.1z" /><path d="M3.5 9.1h17M9.6 4.5 12 9.1l2.4-4.6M8.6 9.1 12 19.8l3.4-10.7" /></>;
    case "digitalna-umjetnost":
      return <><rect height="11.5" rx="2" width="17" x="3.5" y="4.5" /><path d="M9 20h6M12 16v4" /><path d="M8 12.5l2.6-2.8 2 1.8 3.4-3.6" /></>;
    case "3d-umjetnost":
      return <><path d="M12 3.8l7.6 4.2v8L12 20.2 4.4 16V8z" /><path d="M4.4 8l7.6 4.2L19.6 8" /><path d="M12 12.2v8" /></>;
    case "animacija":
      return <><rect height="16" rx="2.4" width="16" x="4" y="4" /><path d="M4 9h16M4 15h16M9 4v5M15 4v5M9 15v5M15 15v5" /></>;
    case "video-umjetnost":
      return <><rect height="10" rx="2.2" width="12.5" x="3" y="7" /><path d="M15.5 10.6l5-2.8v8.4l-5-2.8z" /></>;
    case "instalacija":
      return <><path d="M12 3.6l4.2 6.8H7.8z" /><circle cx="7.6" cy="16" r="3.6" /><rect height="7" rx="1.3" width="7" x="12.8" y="12.6" /></>;
    case "performans":
      return <><circle cx="13.4" cy="4.8" r="1.9" /><path d="M7.6 10.6l3.8-2.4 3.2 1.6 3 2.8" /><path d="M11.4 8.2l-1.2 5.6 3.6 2.6-1 4.2" /><path d="M10.2 13.8l-3.6 5.6" /></>;
    case "konceptualna-umjetnost":
      return <><path d="M9.2 17.4h5.6M10 20.4h4" /><path d="M12 3.6a5.6 5.6 0 0 0-3.4 10.1c.6.5.9 1.1.9 1.9v.4h5v-.4c0-.8.3-1.4.9-1.9A5.6 5.6 0 0 0 12 3.6z" /></>;
    case "multimedijalna-umjetnost":
      return <><rect height="9" rx="1.8" width="11.2" x="3.4" y="5" /><path d="M7.8 7.8v3.4l2.8-1.7z" /><path d="M17.4 9.2a3.8 3.8 0 0 1 0 5.2M19.8 7.2a7 7 0 0 1 0 9.2" /><path d="M6 17.8h6" /></>;
    case "generativna-umjetnost":
      return <><circle cx="6" cy="6" r="1.9" /><circle cx="18" cy="7" r="1.9" /><circle cx="12" cy="18.2" r="1.9" /><circle cx="12" cy="11.4" r="1.9" /><path d="M7.4 7.3l3.2 2.9M16.5 8l-3.1 2.4M12 13.3v3" /></>;
    case "street-art":
      return <><rect height="11.4" rx="1.8" width="8" x="7" y="9" /><path d="M9 9V6.4h4V9M10.2 6.4V4.4h1.6" /><path d="M17.2 5.6h.01M19.2 4h.01M19.2 7.2h.01M20.8 5.6h.01" strokeWidth="2.4" /></>;
    case "strip":
      return <path d="M4.4 6.4A2.4 2.4 0 0 1 6.8 4h10.4a2.4 2.4 0 0 1 2.4 2.4v6.8a2.4 2.4 0 0 1-2.4 2.4h-6.2l-4 4v-4h-.2a2.4 2.4 0 0 1-2.4-2.4z" />;
    case "kaligrafija":
      return <><path d="M12 3.6l5.4 7.4L12 20.4 6.6 11z" /><circle cx="12" cy="11.6" r="1.5" /><path d="M12 3.6v6.5" /></>;
    case "graficki-dizajn":
      return <><rect height="5" rx="1" width="5" x="3.6" y="15.4" /><rect height="5" rx="1" width="5" x="15.4" y="3.6" /><path d="M6.1 15.4C6.1 9 9 6.1 15.4 6.1" /></>;
    case "scenografija":
      return <><path d="M3 4.4h18M3 20.4h18" /><path d="M4.2 4.4v13.4h4.4C6.6 15 5.8 11 5.8 4.4" /><path d="M19.8 4.4v13.4h-4.4c2-2.8 2.8-6.8 2.8-13.4" /><path d="M10.4 15.6h3.2" /></>;
    default:
      return <circle cx="12" cy="12" r="7" />;
  }
}
